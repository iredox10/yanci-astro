import { Client, Databases, Query } from 'node-appwrite';
import { APPWRITE_API_KEY } from 'astro:env/server';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT_ID,
  PUBLIC_APPWRITE_DATABASE_ID,
  PUBLIC_APPWRITE_COLLECTION_VIEWS,
} from 'astro:env/client';

/**
 * Traffic aggregation over the views collection for the admin reports page.
 * Rows are fetched with cursor pagination (capped) and aggregated in JS;
 * no server-side groupBy is assumed.
 */

export const REPORT_RANGES = [7, 30, 90] as const;
export type ReportRange = (typeof REPORT_RANGES)[number];

const PAGE_SIZE = 500;
const MAX_ROWS = 20_000;
const DAY_MS = 86_400_000;

/** Actual stored shape of a tracked view document. */
interface ViewRow {
  $id?: string;
  $createdAt?: string | null;
  article_id?: string | null;
  section?: string | null;
  referrer?: string | null;
  device?: string | null;
  viewed_at?: string | null;
  // Optional fields some trackers may add; absent in the current schema.
  session_id?: string | null;
  sessionId?: string | null;
  ip_hash?: string | null;
}

export interface DailyViews {
  day: string;
  views: number;
}

export interface NamedCount {
  name: string;
  count: number;
}

export interface TopArticle {
  articleId: string;
  views: number;
}

export type VisitorBasis = 'sessions' | 'device-day' | 'none';

export interface TrafficReport {
  rangeDays: ReportRange;
  totalViews7d: number;
  totalViews30d: number;
  uniqueVisitors7d: number;
  visitorBasis: VisitorBasis;
  avgViewsPerArticle: number;
  activeArticles: number;
  daily: DailyViews[];
  topArticles: TopArticle[];
  sections: NamedCount[];
  devices: NamedCount[];
  referrers: NamedCount[];
  sampledRows: number;
  truncated: boolean;
}

export function normalizeRange(raw: unknown): ReportRange {
  const n = Number(raw);
  return (REPORT_RANGES as readonly number[]).includes(n) ? (n as ReportRange) : 30;
}

interface ViewsStore {
  db: Databases;
  databaseId: string;
  viewsId: string;
}

function viewsStore(): ViewsStore | null {
  if (
    !APPWRITE_API_KEY ||
    !PUBLIC_APPWRITE_ENDPOINT ||
    !PUBLIC_APPWRITE_PROJECT_ID ||
    !PUBLIC_APPWRITE_DATABASE_ID ||
    !PUBLIC_APPWRITE_COLLECTION_VIEWS
  ) {
    return null;
  }
  const client = new Client()
    .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
    .setProject(PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);
  return {
    db: new Databases(client),
    databaseId: PUBLIC_APPWRITE_DATABASE_ID,
    viewsId: PUBLIC_APPWRITE_COLLECTION_VIEWS,
  };
}

async function listRecentViews(): Promise<{ rows: ViewRow[]; truncated: boolean }> {
  const store = viewsStore();
  if (!store) return { rows: [], truncated: false };
  const { db, databaseId, viewsId } = store;
  const rows: ViewRow[] = [];
  let cursor: string | undefined;
  let truncated = false;
  while (rows.length < MAX_ROWS) {
    const queries = [Query.limit(Math.min(PAGE_SIZE, MAX_ROWS - rows.length))];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    try {
      const res = await db.listDocuments(databaseId, viewsId, queries);
      const docs = (res.documents ?? []) as unknown as ViewRow[];
      if (docs.length === 0) break;
      rows.push(...docs);
      cursor = String(docs[docs.length - 1]?.$id ?? '');
      if (!cursor || docs.length < PAGE_SIZE) break;
    } catch (error) {
      console.error('[reporting] list views failed', error);
      truncated = rows.length > 0;
      break;
    }
  }
  return { rows, truncated: truncated || rows.length >= MAX_ROWS };
}

function rowDate(v: ViewRow): string {
  const d = v.viewed_at ?? v.$createdAt ?? '';
  return typeof d === 'string' ? d : '';
}

function sessionKeyOf(v: ViewRow): string | null {
  const key = v.sessionId ?? v.session_id ?? v.ip_hash ?? null;
  return key ? String(key) : null;
}

function referrerHost(referrer: string | null | undefined): string {
  const raw = String(referrer ?? '').trim();
  if (!raw) return 'direct';
  try {
    return new URL(raw).hostname.replace(/^www\./, '') || 'direct';
  } catch {
    return raw.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || 'direct';
  }
}

function deviceName(device: string | null | undefined): string {
  const raw = String(device ?? '').trim().toLowerCase();
  return raw || 'unknown';
}

function ranked(map: Map<string, number>, limit: number): NamedCount[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function emptyReport(rangeDays: ReportRange, visitorBasis: VisitorBasis = 'none'): TrafficReport {
  return {
    rangeDays,
    totalViews7d: 0,
    totalViews30d: 0,
    uniqueVisitors7d: 0,
    visitorBasis,
    avgViewsPerArticle: 0,
    activeArticles: 0,
    daily: [],
    topArticles: [],
    sections: [],
    devices: [],
    referrers: [],
    sampledRows: 0,
    truncated: false,
  };
}

/** Build the full traffic report for the requested range (plus fixed 7d/30d KPIs). */
export async function buildTrafficReport(rangeDays: ReportRange): Promise<TrafficReport> {
  const fetchDays = Math.max(rangeDays, 30);
  const now = Date.now();
  const cutoff = new Date(now - fetchDays * DAY_MS);
  const weekCutoff = new Date(now - 7 * DAY_MS);

  const { rows, truncated } = await listRecentViews();
  if (rows.length === 0) return emptyReport(rangeDays);

  const byArticle = new Map<string, number>();
  const bySection = new Map<string, number>();
  const byDevice = new Map<string, number>();
  const byReferrer = new Map<string, number>();
  const byDay = new Map<string, number>();
  const visitors7d = new Set<string>();
  let hasSessionField = false;

  let totalViews30d = 0;
  let totalViews7d = 0;

  for (const v of rows) {
    const iso = rowDate(v);
    if (!iso) continue;
    const ts = Date.parse(iso);
    if (Number.isNaN(ts) || ts < cutoff.getTime()) continue;

    const dayKey = iso.slice(0, 10);
    byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + 1);
    if (ts >= now - 30 * DAY_MS) totalViews30d += 1;
    if (ts >= weekCutoff.getTime()) {
      totalViews7d += 1;
      const sessionKey = sessionKeyOf(v);
      if (sessionKey) {
        hasSessionField = true;
        visitors7d.add(sessionKey);
      } else if (v.device) {
        visitors7d.add(`${deviceName(v.device)}:${dayKey}`);
      }
    }

    const articleId = String(v.article_id ?? '').trim();
    if (articleId) byArticle.set(articleId, (byArticle.get(articleId) ?? 0) + 1);
    const section = String(v.section ?? '').trim().toLowerCase();
    bySection.set(section || 'unknown', (bySection.get(section || 'unknown') ?? 0) + 1);
    const device = deviceName(v.device);
    byDevice.set(device, (byDevice.get(device) ?? 0) + 1);
    const host = referrerHost(v.referrer);
    byReferrer.set(host, (byReferrer.get(host) ?? 0) + 1);
  }

  const daily: DailyViews[] = [];
  for (let i = rangeDays - 1; i >= 0; i--) {
    const day = new Date(now - i * DAY_MS).toISOString().slice(0, 10);
    daily.push({ day, views: byDay.get(day) ?? 0 });
  }

  const activeArticles = byArticle.size;
  const windowTotal = [...byDay.values()].reduce((sum, n) => sum + n, 0);

  return {
    rangeDays,
    totalViews7d,
    totalViews30d,
    uniqueVisitors7d: visitors7d.size,
    visitorBasis: hasSessionField ? 'sessions' : visitors7d.size > 0 ? 'device-day' : 'none',
    avgViewsPerArticle: activeArticles > 0 ? Math.round((windowTotal / activeArticles) * 10) / 10 : 0,
    activeArticles,
    daily,
    topArticles: ranked(byArticle, 10).map(({ name, count }) => ({ articleId: name, views: count })),
    sections: ranked(bySection, 10),
    devices: ranked(byDevice, 6),
    referrers: ranked(byReferrer, 8),
    sampledRows: rows.length,
    truncated,
  };
}
