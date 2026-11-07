import { db } from '@db';
import { articleViews } from '@db/schema';
import { gte, desc } from 'drizzle-orm';

/**
 * Traffic aggregation over the `article_views` table for the admin reports page.
 */

export const REPORT_RANGES = [7, 30, 90] as const;
export type ReportRange = (typeof REPORT_RANGES)[number];

const DAY_MS = 86_400_000;

interface ViewRow {
  articleId: string;
  section?: string | null;
  referrer?: string | null;
  device?: string | null;
  sessionId?: string | null;
  ipHash?: string | null;
  viewedAt: Date;
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

export async function buildTrafficReport(rangeDays: ReportRange): Promise<TrafficReport> {
  if (!db) return emptyReport(rangeDays);

  const fetchDays = Math.max(rangeDays, 30);
  const now = Date.now();
  const cutoff = new Date(now - fetchDays * DAY_MS);
  const weekCutoff = new Date(now - 7 * DAY_MS);

  let rows: ViewRow[] = [];
  try {
    const results = await db
      .select({
        articleId: articleViews.articleId,
        section: articleViews.section,
        referrer: articleViews.referrer,
        device: articleViews.device,
        sessionId: articleViews.sessionId,
        ipHash: articleViews.ipHash,
        viewedAt: articleViews.viewedAt,
      })
      .from(articleViews)
      .where(gte(articleViews.viewedAt, cutoff))
      .orderBy(desc(articleViews.viewedAt))
      .limit(20000);

    rows = results;
  } catch (error) {
    console.error('[reporting] query failed', error);
    return emptyReport(rangeDays);
  }

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
    const ts = v.viewedAt ? v.viewedAt.getTime() : 0;
    if (!ts || ts < cutoff.getTime()) continue;

    const dayKey = v.viewedAt.toISOString().slice(0, 10);
    byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + 1);
    if (ts >= now - 30 * DAY_MS) totalViews30d += 1;
    if (ts >= weekCutoff.getTime()) {
      totalViews7d += 1;
      const sessionKey = v.sessionId || v.ipHash || null;
      if (sessionKey) {
        hasSessionField = true;
        visitors7d.add(sessionKey);
      } else if (v.device) {
        visitors7d.add(`${deviceName(v.device)}:${dayKey}`);
      }
    }

    const articleId = String(v.articleId ?? '').trim();
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
    truncated: rows.length >= 20000,
  };
}
