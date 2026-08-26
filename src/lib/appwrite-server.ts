import { Client, Databases, ID, Query } from 'node-appwrite';
import {
  APPWRITE_API_KEY,
  APPWRITE_COLLECTION_NEWSLETTER,
} from 'astro:env/server';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT_ID,
  PUBLIC_APPWRITE_DATABASE_ID,
  PUBLIC_APPWRITE_COLLECTION_ARTICLES,
  PUBLIC_APPWRITE_COLLECTION_VIEWS,
  PUBLIC_APPWRITE_COLLECTION_HIGHLIGHTS,
  PUBLIC_APPWRITE_COLLECTION_HOMEPAGE_STATS,
  PUBLIC_APPWRITE_COLLECTION_SPORTS,
  PUBLIC_APPWRITE_COLLECTION_HOMEPAGE_LAYOUT,
  PUBLIC_APPWRITE_COLLECTION_SETTINGS,
  PUBLIC_APPWRITE_COLLECTION_ELECTIONS,
  PUBLIC_APPWRITE_COLLECTION_CANDIDATES,
  PUBLIC_APPWRITE_COLLECTION_RESULTS,
  PUBLIC_APPWRITE_COLLECTION_FACTCHECKS,
  PUBLIC_APPWRITE_COLLECTION_STAFF,
  PUBLIC_APPWRITE_COLLECTION_COMMENTS,
} from 'astro:env/client';
import type { Article, LiveUpdate, Comment } from '../data/schema';

/**
 * Server-only Appwrite access. The secret `APPWRITE_API_KEY` stays on the
 * server and is never bundled to the browser.
 */

let _databases: Databases | null = null;

export function isAppwriteConfigured(): boolean {
  return Boolean(
    APPWRITE_API_KEY &&
      PUBLIC_APPWRITE_PROJECT_ID &&
      PUBLIC_APPWRITE_DATABASE_ID &&
      PUBLIC_APPWRITE_COLLECTION_ARTICLES,
  );
}

function databases(): Databases {
  if (!_databases) {
    const client = new Client()
      .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
      .setProject(PUBLIC_APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY ?? '');
    _databases = new Databases(client);
  }
  return _databases;
}

interface CacheEntry<T> {
  value: T;
  expires: number;
}

const _readCache = new Map<string, CacheEntry<unknown>>();

async function cachedRead<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const hit = _readCache.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await load();
  _readCache.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}

function staleOr<T>(key: string, fallback: T): T {
  const hit = _readCache.get(key) as CacheEntry<T> | undefined;
  return hit ? hit.value : fallback;
}

type Collections = {
  databaseId: string;
  articles: string;
  views: string | null;
  newsletter: string | null;
  comments: string | null;
};

function collections(): Collections | null {
  if (
    !APPWRITE_API_KEY ||
    !PUBLIC_APPWRITE_PROJECT_ID ||
    !PUBLIC_APPWRITE_DATABASE_ID ||
    !PUBLIC_APPWRITE_COLLECTION_ARTICLES
  ) {
    return null;
  }
  return {
    databaseId: PUBLIC_APPWRITE_DATABASE_ID,
    articles: PUBLIC_APPWRITE_COLLECTION_ARTICLES,
    views: PUBLIC_APPWRITE_COLLECTION_VIEWS ?? null,
    newsletter: APPWRITE_COLLECTION_NEWSLETTER ?? null,
    comments: PUBLIC_APPWRITE_COLLECTION_COMMENTS ?? null,
  };
}

function parseLiveUpdates(raw: unknown): LiveUpdate[] | undefined {
  if (Array.isArray(raw)) {
    // Collection stores each update as a JSON string (legacy format).
    return raw
      .map((u) => {
        if (typeof u === 'string') {
          try {
            return JSON.parse(u);
          } catch {
            return null;
          }
        }
        return u;
      })
      .filter((u): u is LiveUpdate => u !== null && typeof u === 'object');
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as LiveUpdate[]) : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/** Map an Appwrite document to the shared Article type. */
export function toArticle(doc: Record<string, unknown>): Article {
  return {
    $id: doc.$id as string,
    ...doc,
    liveUpdates: parseLiveUpdates(doc.liveUpdates),
  } as unknown as Article;
}

// ─── Read actions ────────────────────────────────────────────────────────────
export async function getArticles(limit = 200): Promise<Article[]> {
  const c = collections();
  if (!c) return [];
  const key = `articles:${limit}`;
  try {
    return await cachedRead(key, 30_000, async () => {
      const { documents } = await databases().listDocuments(c.databaseId, c.articles, [
        Query.orderDesc('$createdAt'),
        Query.limit(Math.min(limit, 100)),
      ]);
      if (!documents || documents.length === 0) throw new Error('no articles');
      return (documents ?? []).map((doc) => toArticle(doc as unknown as Record<string, unknown>));
    });
  } catch (error) {
    console.error('[appwrite] getArticles failed', error);
    return staleOr<Article[]>(key, []);
  }
}

export async function getArticleById(id: string): Promise<Article | null> {
  const c = collections();
  if (!c) return null;
  try {
    return await cachedRead(`article:id:${id}`, 30_000, async () => {
      const doc = await databases().getDocument(c.databaseId, c.articles, id);
      return toArticle(doc as unknown as Record<string, unknown>);
    });
  } catch {
    return null;
  }
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const c = collections();
  if (!c) return null;
  try {
    return await cachedRead(`article:slug:${slug}`, 30_000, async () => {
      const { documents } = await databases().listDocuments(c.databaseId, c.articles, [
        Query.equal('slug', slug),
        Query.limit(1),
      ]);
      if (!documents?.[0]) throw new Error('not found');
      return toArticle(documents[0] as unknown as Record<string, unknown>);
    });
  } catch {
    return null;
  }
}

// ─── Comments ────────────────────────────────────────────────────────────────
/** Public visibility rule: comments without a status (legacy rows) count as approved. */
export function isCommentVisible(c: { status?: string | null }): boolean {
  return c.status === undefined || c.status === null || c.status === '' || c.status === 'approved';
}

export async function getComments(
  articleId: string,
  sort: 'latest' | 'top' = 'latest',
  limit = 100,
): Promise<Comment[]> {
  const c = collections();
  if (!c || !c.comments) return [];
  try {
    const { documents } = await databases().listDocuments(c.databaseId, c.comments, [
      Query.equal('articleId', articleId),
      sort === 'top' ? Query.orderDesc('likes') : Query.orderDesc('$createdAt'),
      Query.limit(Math.min(limit, 200)),
    ]);
    return (documents ?? [])
      .map((d) => d as unknown as Comment)
      .filter((c) => isCommentVisible(c));
  } catch (error) {
    console.error('[appwrite] getComments failed', error);
    return [];
  }
}

/** Admin moderation list: all comments for a status, newest first. */
export async function getAllComments(
  status?: string,
  limit = 200,
): Promise<Comment[]> {
  const c = collections();
  if (!c || !c.comments) return [];
  try {
    const queries = [];
    if (status === 'pending' || status === 'approved' || status === 'rejected') {
      queries.push(Query.equal('status', status));
    }
    queries.push(Query.orderDesc('$createdAt'), Query.limit(Math.min(limit, 200)));
    const { documents } = await databases().listDocuments(c.databaseId, c.comments, queries);
    return (documents ?? []).map((d) => d as unknown as Comment);
  } catch (error) {
    console.error('[appwrite] getAllComments failed', error);
    return [];
  }
}

// ─── Views / analytics ───────────────────────────────────────────────────────
export async function trackView(input: {
  articleId: string;
  section?: string | null;
  referrer?: string | null;
  device?: string | null;
}): Promise<void> {
  const c = collections();
  if (!c || !c.views) return;
  try {
    await databases().createDocument(c.databaseId, c.views, ID.unique(), {
      article_id: input.articleId,
      section: input.section ?? null,
      referrer: input.referrer ?? null,
      device: input.device ?? null,
      viewed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[appwrite] trackView failed', error);
  }
}

export async function getMostRead(limit = 10): Promise<{ articleId: string; views: number }[]> {
  const c = collections();
  if (!c || !c.views) return [];
  const key = `mostread:${limit}`;
  const viewsId = c.views;
  try {
    return await cachedRead(key, 60_000, async () => {
      const { documents } = await databases().listDocuments(c.databaseId, viewsId, [
        Query.limit(1000),
      ]);
      const counts = new Map<string, number>();
      for (const doc of documents ?? []) {
        const id = (doc as any).article_id;
        if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([articleId, views]) => ({ articleId, views }));
    });
  } catch {
    return staleOr<{ articleId: string; views: number }[]>(key, []);
  }
}

export function viewCountFor(articleId: string, most: Awaited<ReturnType<typeof getMostRead>>): number {
  return most.find((m) => m.articleId === articleId)?.views ?? 0;
}

/**
 * Trending tags derived from the most-read articles' tags (by view count),
 * padded with the top sections. Returns [] when there is no DB data so the
 * caller can fall back to seed content.
 */
export async function getTrending(limit = 6): Promise<string[]> {
  const c = collections();
  if (!c) return [];
  try {
    const most = await getMostRead(20);
    if (most.length === 0) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const { articleId } of most) {
      const article = await getArticleById(articleId);
      for (const tag of article?.tags ?? []) {
        const clean = tag.trim();
        if (clean && !seen.has(clean)) {
          seen.add(clean);
          out.push(clean.startsWith('#') ? clean : `#${clean}`);
        }
        if (out.length >= limit) return out;
      }
    }
    if (out.length === 0) {
      for (const a of await getArticles(20)) {
        const section = a.section?.trim();
        if (section && !seen.has(section)) {
          seen.add(section);
          out.push(`#${section}`);
        }
        if (out.length >= limit) break;
      }
    }
    return out;
  } catch (error) {
    console.error('[appwrite] getTrending failed', error);
    return [];
  }
}

// ─── Newsletter subscriptions ────────────────────────────────────────────────
export async function subscribeNewsletter(email: string): Promise<boolean> {
  const c = collections();
  if (!c || !c.newsletter) return false;
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return false;
  try {
    await databases().createDocument(c.databaseId, c.newsletter, ID.unique(), {
      email: normalized,
      subscribed_at: new Date().toISOString(),
      status: 'subscribed',
    });
    return true;
  } catch (error) {
    console.error('[appwrite] subscribeNewsletter failed', error);
    return false;
  }
}

export async function unsubscribeNewsletter(email: string): Promise<boolean> {
  const c = collections();
  if (!c || !c.newsletter) return false;
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return false;
  try {
    const found = await databases().listDocuments(c.databaseId, c.newsletter, [
      Query.equal('email', normalized),
      Query.limit(1),
    ]);
    if (found.documents.length === 0) return false;
    await databases().updateDocument(
      c.databaseId,
      c.newsletter,
      found.documents[0].$id,
      { status: 'unsubscribed' },
    );
    return true;
  } catch (error) {
    console.error('[appwrite] unsubscribeNewsletter failed', error);
    return false;
  }
}

// ─── Homepage content collections ────────────────────────────────────────────

function docCollection(collectionId: string | null | undefined): string | null {
  return collectionId || null;
}

function databaseId(): string | null {
  return PUBLIC_APPWRITE_DATABASE_ID || null;
}

export interface HomepageHighlight {
  $id?: string;
  tag: string;
  title: string;
  copy: string;
  icon: string;
  accent: string;
  gradient: string;
  link?: string;
  order?: number;
  active?: boolean;
}

export async function getHighlights(limit = 20): Promise<HomepageHighlight[]> {
  const id = docCollection(PUBLIC_APPWRITE_COLLECTION_HIGHLIGHTS);
  const dbId = databaseId();
  if (!dbId || !id) return [];
  try {
    const { documents } = await databases().listDocuments(dbId, id, [
      Query.limit(limit),
    ]);
    return (documents ?? [])
      .filter((d) => d.active !== false)
      .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
      .map((d) => ({
        $id: d.$id,
        tag: String(d.tag ?? ''),
        title: String(d.title ?? ''),
        copy: String(d.copy ?? ''),
        icon: String(d.icon ?? 'trend'),
        accent: String(d.accent ?? '#10b981'),
        gradient: String(d.gradient ?? ''),
        link: d.link ? String(d.link) : undefined,
        order: Number(d.order ?? 0),
        active: d.active !== false,
      }));
  } catch (error) {
    console.error('[appwrite] getHighlights failed', error);
    return [];
  }
}

export interface HomepageStat {
  $id?: string;
  label: string;
  value: number;
  suffix: string;
  icon: string;
  order?: number;
  active?: boolean;
}

export async function getHomepageStats(limit = 20): Promise<HomepageStat[]> {
  const id = docCollection(PUBLIC_APPWRITE_COLLECTION_HOMEPAGE_STATS);
  const dbId = databaseId();
  if (!dbId || !id) return [];
  try {
    const { documents } = await databases().listDocuments(dbId, id, [
      Query.limit(limit),
    ]);
    return (documents ?? [])
      .filter((d) => d.active !== false)
      .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
      .map((d) => ({
        $id: d.$id,
        label: String(d.label ?? ''),
        value: Number(d.value ?? 0),
        suffix: String(d.suffix ?? ''),
        icon: String(d.icon ?? 'article'),
        order: Number(d.order ?? 0),
        active: d.active !== false,
      }));
  } catch (error) {
    console.error('[appwrite] getHomepageStats failed', error);
    return [];
  }
}

function parseJsonArray(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw as unknown[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as unknown[]) : null;
    } catch {
      return null;
    }
  }
  return null;
}

export interface SportsData {
  $id?: string;
  liveMatches: unknown[];
  standings: unknown[];
  fixtures: unknown[];
}

export async function getSportsData(): Promise<SportsData | null> {
  const id = docCollection(PUBLIC_APPWRITE_COLLECTION_SPORTS);
  const dbId = databaseId();
  if (!dbId || !id) return null;
  try {
    const { documents } = await databases().listDocuments(dbId, id, [
      Query.limit(1),
    ]);
    const doc = documents?.[0];
    if (!doc) return null;
    return {
      $id: doc.$id,
      liveMatches: parseJsonArray(doc.liveMatches) ?? [],
      standings: parseJsonArray(doc.standings) ?? [],
      fixtures: parseJsonArray(doc.fixtures) ?? [],
    };
  } catch (error) {
    console.error('[appwrite] getSportsData failed', error);
    return null;
  }
}

export async function getSettings(limit = 100): Promise<Record<string, string>> {
  const id = docCollection(PUBLIC_APPWRITE_COLLECTION_SETTINGS);
  const dbId = databaseId();
  if (!dbId || !id) return {};
  const key = 'settings';
  try {
    return await cachedRead(key, 60_000, async () => {
      const { documents } = await databases().listDocuments(dbId, id, [
        Query.limit(1),
      ]);
      const doc = documents?.[0];
      if (!doc) return {};
      const out: Record<string, string> = {};
      for (const [k, value] of Object.entries(doc)) {
        if (k.startsWith('$')) continue;
        if (value === null || value === undefined) continue;
        out[k] = String(value);
      }
      return out;
    });
  } catch (error) {
    console.error('[appwrite] getSettings failed', error);
    return staleOr<Record<string, string>>(key, {});
  }
}

export interface ElectionDoc {
  $id?: string;
  name: string;
  fullName: string;
  date: string;
  type: string;
  status: string;
  electoralBody: string;
  description: string;
  image: string;
  published?: boolean;
}

export async function getElections(limit = 20): Promise<ElectionDoc[]> {
  const id = docCollection(PUBLIC_APPWRITE_COLLECTION_ELECTIONS);
  const dbId = databaseId();
  if (!dbId || !id) return [];
  try {
    const { documents } = await databases().listDocuments(dbId, id, [
      Query.limit(limit),
    ]);
    return (documents ?? []).map((d) => ({
      $id: d.$id,
      name: String(d.name ?? ''),
      fullName: String(d.fullName ?? ''),
      date: String(d.date ?? ''),
      type: String(d.type ?? ''),
      status: String(d.status ?? ''),
      electoralBody: String(d.electoralBody ?? ''),
      description: String(d.description ?? ''),
      image: String(d.image ?? ''),
      published: d.published !== false,
    }));
  } catch (error) {
    console.error('[appwrite] getElections failed', error);
    return [];
  }
}

export interface CandidateDoc {
  $id?: string;
  electionId: string;
  name: string;
  party: string;
  position: string;
  state: string;
  education: string;
  platform: string;
  runningMate: string;
  previousOffice: string;
  image: string;
  order?: number;
}

export async function getCandidates(electionId?: string, limit = 100): Promise<CandidateDoc[]> {
  const id = docCollection(PUBLIC_APPWRITE_COLLECTION_CANDIDATES);
  const dbId = databaseId();
  if (!dbId || !id) return [];
  try {
    const queries = electionId
      ? [Query.equal('electionId', electionId), Query.limit(limit)]
      : [Query.limit(limit)];
    const { documents } = await databases().listDocuments(dbId, id, queries);
    return (documents ?? []).map((d) => ({
      $id: d.$id,
      electionId: String(d.electionId ?? ''),
      name: String(d.name ?? ''),
      party: String(d.party ?? ''),
      position: String(d.position ?? ''),
      state: String(d.state ?? ''),
      education: String(d.education ?? ''),
      platform: String(d.platform ?? ''),
      runningMate: String(d.runningMate ?? ''),
      previousOffice: String(d.previousOffice ?? ''),
      image: String(d.image ?? ''),
      order: Number(d.order ?? 0),
    }));
  } catch (error) {
    console.error('[appwrite] getCandidates failed', error);
    return [];
  }
}

export interface ResultDoc {
  $id?: string;
  electionId: string;
  state: string;
  region: string;
  candidateVotes: Record<string, number>;
  met25Threshold: string[];
  winner: string;
  governor: string;
  senate: Record<string, number>;
  registeredVoters: number;
  accreditedVoters: number;
  validVotes: number;
  rejectedVotes: number;
}

export async function getResults(electionId?: string, limit = 200): Promise<ResultDoc[]> {
  const id = docCollection(PUBLIC_APPWRITE_COLLECTION_RESULTS);
  const dbId = databaseId();
  if (!dbId || !id) return [];
  try {
    const queries = electionId
      ? [Query.equal('electionId', electionId), Query.limit(limit)]
      : [Query.limit(limit)];
    const { documents } = await databases().listDocuments(dbId, id, queries);
    const parseObj = (raw: unknown): Record<string, number> => {
      if (raw && typeof raw === 'object') return raw as Record<string, number>;
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {};
        } catch {
          return {};
        }
      }
      return {};
    };
    return (documents ?? []).map((d) => ({
      $id: d.$id,
      electionId: String(d.electionId ?? ''),
      state: String(d.state ?? ''),
      region: String(d.region ?? ''),
      candidateVotes: parseObj(d.candidateVotes),
      met25Threshold: (parseJsonArray(d.met25Threshold) ?? []).map(String),
      winner: String(d.winner ?? ''),
      governor: String(d.governor ?? ''),
      senate: parseObj(d.senate),
      registeredVoters: Number(d.registeredVoters ?? 0),
      accreditedVoters: Number(d.accreditedVoters ?? 0),
      validVotes: Number(d.validVotes ?? 0),
      rejectedVotes: Number(d.rejectedVotes ?? 0),
    }));
  } catch (error) {
    console.error('[appwrite] getResults failed', error);
    return [];
  }
}

export interface FactCheckDoc {
  $id?: string;
  electionId: string;
  claim: string;
  claimant: string;
  claimantParty: string;
  verdict: string;
  analysis: string;
  source: string;
  date: string;
  relatedArticleId?: string;
}

export async function getFactChecks(electionId?: string, limit = 100): Promise<FactCheckDoc[]> {
  const id = docCollection(PUBLIC_APPWRITE_COLLECTION_FACTCHECKS);
  const dbId = databaseId();
  if (!dbId || !id) return [];
  try {
    const queries = electionId
      ? [Query.equal('electionId', electionId), Query.limit(limit)]
      : [Query.limit(limit)];
    const { documents } = await databases().listDocuments(dbId, id, queries);
    return (documents ?? []).map((d) => ({
      $id: d.$id,
      electionId: String(d.electionId ?? ''),
      claim: String(d.claim ?? ''),
      claimant: String(d.claimant ?? ''),
      claimantParty: String(d.claimantParty ?? ''),
      verdict: String(d.verdict ?? 'unverified'),
      analysis: String(d.analysis ?? ''),
      source: String(d.source ?? ''),
      date: String(d.date ?? ''),
      relatedArticleId: d.relatedArticleId ? String(d.relatedArticleId) : undefined,
    }));
  } catch (error) {
    console.error('[appwrite] getFactChecks failed', error);
    return [];
  }
}

export interface StaffDoc {
  $id?: string;
  name: string;
  email: string;
  role: string;
  category: string;
  status: string;
  bio: string;
  image: string;
  order?: number;
}

export async function getStaff(limit = 100): Promise<StaffDoc[]> {
  const id = docCollection(PUBLIC_APPWRITE_COLLECTION_STAFF);
  const dbId = databaseId();
  if (!dbId || !id) return [];
  try {
    const { documents } = await databases().listDocuments(dbId, id, [
      Query.limit(limit),
    ]);
    return (documents ?? []).map((d) => ({
      $id: d.$id,
      name: String(d.name ?? ''),
      email: String(d.email ?? ''),
      role: String(d.role ?? ''),
      category: String(d.category ?? ''),
      status: String(d.status ?? ''),
      bio: String(d.bio ?? ''),
      image: String(d.image ?? ''),
      order: Number(d.order ?? 0),
    }));
  } catch (error) {
    console.error('[appwrite] getStaff failed', error);
    return [];
  }
}