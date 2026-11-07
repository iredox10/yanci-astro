import { desc, eq, and, sql, inArray, or } from 'drizzle-orm';
import {
  db,
  articles,
  articleViews,
  comments,
  newsletterSubscribers,
  highlights,
  homepageStats,
  sportsData,
  settings,
  elections,
  candidates,
  electionResults,
  factChecks,
  users,
} from '../db';
import type { Article, LiveUpdate, Comment } from '../data/schema';

export function isAppwriteConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
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
  try {
    const value = await load();
    _readCache.set(key, { value, expires: Date.now() + ttlMs });
    return value;
  } catch (err) {
    if (hit) return hit.value;
    throw err;
  }
}

function staleOr<T>(key: string, fallback: T): T {
  const hit = _readCache.get(key) as CacheEntry<T> | undefined;
  return hit ? hit.value : fallback;
}

function parseLiveUpdates(raw: unknown): LiveUpdate[] {
  if (Array.isArray(raw)) {
    return raw.map((u) => {
      if (typeof u === 'string') {
        try {
          return JSON.parse(u);
        } catch {
          return null;
        }
      }
      return u;
    }).filter((u): u is LiveUpdate => u !== null && typeof u === 'object');
  }
  return [];
}

/** Map a PostgreSQL articles record to the shared Article type. */
export function toArticle(row: any): Article {
  const isBreaking = Boolean(row.isBreaking ?? row.is_breaking);
  const breakingUntil = row.breakingUntil ? new Date(row.breakingUntil).toISOString() : (row.breaking_until ?? undefined);

  return {
    $id: String(row.id),
    id: String(row.id),
    headline: String(row.headline ?? ''),
    kicker: row.kicker ? String(row.kicker) : undefined,
    trail: row.trail ? String(row.trail) : undefined,
    body: String(row.body ?? ''),
    image: row.image ? String(row.image) : undefined,
    videoUrl: row.videoUrl ?? row.video_url ?? undefined,
    pillar: String(row.pillar ?? 'news'),
    section: String(row.section ?? 'headlines'),
    type: String(row.type ?? 'standard'),
    author: String(row.author ?? 'Yanci'),
    isLive: Boolean(row.isLive ?? row.is_live),
    liveUpdates: parseLiveUpdates(row.liveUpdates ?? row.live_updates),
    series: row.series ? String(row.series) : undefined,
    status: (row.status as 'draft' | 'published' | 'scheduled') || 'published',
    publishAt: row.publishAt ? new Date(row.publishAt).toISOString() : (row.publish_at ?? undefined),
    slug: row.slug ? String(row.slug) : undefined,
    metaTitle: row.metaTitle ?? row.meta_title ?? undefined,
    metaDescription: row.metaDescription ?? row.meta_description ?? undefined,
    isSensitive: Boolean(row.isSensitive ?? row.is_sensitive),
    imageFocalX: Number(row.imageFocalX ?? row.image_focal_x ?? 50),
    imageFocalY: Number(row.imageFocalY ?? row.image_focal_y ?? 50),
    format: row.format ? String(row.format) : undefined,
    is_breaking: isBreaking,
    breaking_until: breakingUntil,
    review_status: (row.reviewStatus ?? row.review_status ?? 'approved') as 'pending' | 'approved' | 'rejected',
    focal_point: row.focalPoint ?? row.focal_point ?? undefined,
    saved_count: Number(row.savedCount ?? row.saved_count ?? 0),
    source_url: row.sourceUrl ?? row.source_url ?? undefined,
    imageCaption: row.imageCaption ?? row.image_caption ?? undefined,
    imageCredit: row.imageCredit ?? row.image_credit ?? undefined,
    imageAlt: row.imageAlt ?? row.image_alt ?? undefined,
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    coAuthor: row.coAuthor ?? row.co_author ?? undefined,
    ogTitle: row.ogTitle ?? row.og_title ?? undefined,
    ogDescription: row.ogDescription ?? row.og_description ?? undefined,
    relatedArticles: Array.isArray(row.relatedArticles ?? row.related_articles)
      ? (row.relatedArticles ?? row.related_articles).map(String)
      : [],
    views: Number(row.views ?? 0),
    $createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : (row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()),
    $updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : (row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()),
  };
}

export function serializeArticle(article: Partial<Article>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (article.id !== undefined || article.$id !== undefined) row.id = String(article.id ?? article.$id);
  if (article.headline !== undefined) row.headline = article.headline;
  if (article.kicker !== undefined) row.kicker = article.kicker;
  if (article.trail !== undefined) row.trail = article.trail;
  if (article.body !== undefined) row.body = article.body;
  if (article.image !== undefined) row.image = article.image;
  if (article.videoUrl !== undefined) row.videoUrl = article.videoUrl;
  if (article.pillar !== undefined) row.pillar = article.pillar;
  if (article.section !== undefined) row.section = article.section;
  if (article.type !== undefined) row.type = article.type;
  if (article.author !== undefined) row.author = article.author;
  if (article.isLive !== undefined) row.isLive = article.isLive;
  if (article.liveUpdates !== undefined) row.liveUpdates = article.liveUpdates;
  if (article.series !== undefined) row.series = article.series;
  if (article.status !== undefined) row.status = article.status;
  if (article.publishAt !== undefined) row.publishAt = article.publishAt ? new Date(article.publishAt) : null;
  if (article.slug !== undefined) row.slug = article.slug;
  if (article.metaTitle !== undefined) row.metaTitle = article.metaTitle;
  if (article.metaDescription !== undefined) row.metaDescription = article.metaDescription;
  if (article.isSensitive !== undefined) row.isSensitive = article.isSensitive;
  if (article.imageFocalX !== undefined) row.imageFocalX = article.imageFocalX;
  if (article.imageFocalY !== undefined) row.imageFocalY = article.imageFocalY;
  if (article.format !== undefined) row.format = article.format;
  if (article.is_breaking !== undefined) row.isBreaking = article.is_breaking;
  if (article.breaking_until !== undefined) row.breakingUntil = article.breaking_until ? new Date(article.breaking_until) : null;
  if (article.review_status !== undefined) row.reviewStatus = article.review_status;
  if (article.focal_point !== undefined) row.focalPoint = article.focal_point;
  if (article.source_url !== undefined) row.sourceUrl = article.source_url;
  if (article.imageCaption !== undefined) row.imageCaption = article.imageCaption;
  if (article.imageCredit !== undefined) row.imageCredit = article.imageCredit;
  if (article.imageAlt !== undefined) row.imageAlt = article.imageAlt;
  if (article.tags !== undefined) row.tags = article.tags;
  if (article.coAuthor !== undefined) row.coAuthor = article.coAuthor;
  if (article.ogTitle !== undefined) row.ogTitle = article.ogTitle;
  if (article.ogDescription !== undefined) row.ogDescription = article.ogDescription;
  if (article.relatedArticles !== undefined) row.relatedArticles = article.relatedArticles;
  return row;
}

export async function getArticles(limit = 200): Promise<Article[]> {
  const key = `articles:${limit}`;
  try {
    return await cachedRead(key, 30_000, async () => {
      const rows = await db
        .select()
        .from(articles)
        .where(eq(articles.status, 'published'))
        .orderBy(desc(articles.createdAt))
        .limit(limit);
      return rows.map(toArticle);
    });
  } catch (error) {
    console.error('[db] getArticles failed', error);
    return staleOr<Article[]>(key, []);
  }
}

export async function getArticleById(id: string): Promise<Article | null> {
  const cleanId = String(id).trim();
  if (!cleanId) return null;
  const key = `article:${cleanId}`;
  try {
    return await cachedRead(key, 60_000, async () => {
      const rows = await db
        .select()
        .from(articles)
        .where(eq(articles.id, cleanId))
        .limit(1);
      if (!rows.length) return null;
      return toArticle(rows[0]);
    });
  } catch (error) {
    console.error(`[db] getArticleById(${cleanId}) failed`, error);
    return staleOr<Article | null>(key, null);
  }
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const cleanSlug = String(slug).trim();
  if (!cleanSlug) return null;
  const key = `article:slug:${cleanSlug}`;
  try {
    return await cachedRead(key, 60_000, async () => {
      const rows = await db
        .select()
        .from(articles)
        .where(eq(articles.slug, cleanSlug))
        .limit(1);
      if (!rows.length) return null;
      return toArticle(rows[0]);
    });
  } catch (error) {
    console.error(`[db] getArticleBySlug(${cleanSlug}) failed`, error);
    return staleOr<Article | null>(key, null);
  }
}

export async function getBreakingArticles(limit = 10): Promise<Article[]> {
  const key = `breaking:${limit}`;
  try {
    return await cachedRead(key, 30_000, async () => {
      const rows = await db
        .select()
        .from(articles)
        .where(
          and(
            eq(articles.status, 'published'),
            eq(articles.isBreaking, true),
            sql`(${articles.breakingUntil} IS NULL OR ${articles.breakingUntil} > NOW())`
          )
        )
        .orderBy(desc(articles.createdAt))
        .limit(limit);
      return rows.map(toArticle);
    });
  } catch (error) {
    console.error('[db] getBreakingArticles failed', error);
    return staleOr<Article[]>(key, []);
  }
}

export function isCommentVisible(c: { status?: string | null }): boolean {
  return c.status === 'approved' || c.status === undefined || c.status === null;
}

export async function getComments(articleId: string, limit = 50): Promise<Comment[]> {
  const cleanId = String(articleId).trim();
  if (!cleanId) return [];
  try {
    const rows = await db
      .select()
      .from(comments)
      .where(and(eq(comments.articleId, cleanId), eq(comments.status, 'approved')))
      .orderBy(desc(comments.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      $id: r.id,
      articleId: r.articleId,
      name: r.name,
      body: r.body,
      likes: r.likes,
      ownerToken: r.ownerToken ?? undefined,
      status: r.status as 'pending' | 'approved' | 'rejected',
      $createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.error('[db] getComments failed', error);
    return [];
  }
}

export async function getAllComments(
  statusOrLimit?: string | number,
  limitNum = 100,
): Promise<Comment[]> {
  try {
    let limit = limitNum;
    let statusFilter: string | undefined;

    if (typeof statusOrLimit === 'number') {
      limit = statusOrLimit;
    } else if (typeof statusOrLimit === 'string' && statusOrLimit.trim()) {
      statusFilter = statusOrLimit.trim();
    }

    const query = statusFilter
      ? db.select().from(comments).where(eq(comments.status, statusFilter)).orderBy(desc(comments.createdAt)).limit(limit)
      : db.select().from(comments).orderBy(desc(comments.createdAt)).limit(limit);

    const rows = await query;

    return rows.map((r) => ({
      $id: r.id,
      articleId: r.articleId,
      name: r.name,
      body: r.body,
      likes: r.likes,
      ownerToken: r.ownerToken ?? undefined,
      status: r.status as 'pending' | 'approved' | 'rejected',
      $createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.error('[db] getAllComments failed', error);
    return [];
  }
}

export async function trackView(input: {
  articleId: string;
  sessionId?: string;
  ipHash?: string;
  referrer?: string;
  section?: string;
  country?: string;
  device?: string;
}): Promise<boolean> {
  const articleId = String(input.articleId ?? '').trim();
  if (!articleId) return false;

  try {
    const viewId = `vw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await db.insert(articleViews).values({
      id: viewId,
      articleId,
      sessionId: input.sessionId,
      ipHash: input.ipHash,
      referrer: input.referrer,
      section: input.section,
      country: input.country,
      device: input.device,
    });

    await db
      .update(articles)
      .set({ views: sql`${articles.views} + 1` })
      .where(eq(articles.id, articleId));

    return true;
  } catch (error) {
    console.error('[db] trackView failed', error);
    return false;
  }
}

export async function getMostRead(limit = 10): Promise<{ articleId: string; views: number }[]> {
  const key = `mostread:${limit}`;
  try {
    return await cachedRead(key, 60_000, async () => {
      const rows = await db
        .select({ id: articles.id, views: articles.views })
        .from(articles)
        .where(eq(articles.status, 'published'))
        .orderBy(desc(articles.views))
        .limit(limit);

      return rows.map((r) => ({ articleId: r.id, views: Number(r.views ?? 0) }));
    });
  } catch (error) {
    console.error('[db] getMostRead failed', error);
    return staleOr(key, []);
  }
}

export function viewCountFor(
  articleId: string,
  most: Awaited<ReturnType<typeof getMostRead>>,
): number {
  return most.find((m) => m.articleId === articleId)?.views ?? 0;
}

export async function getTrending(limit = 6): Promise<string[]> {
  try {
    const rows = await db
      .select({ tags: articles.tags })
      .from(articles)
      .where(eq(articles.status, 'published'))
      .orderBy(desc(articles.views))
      .limit(30);

    const tagCounts = new Map<string, number>();
    for (const r of rows) {
      if (Array.isArray(r.tags)) {
        for (const t of r.tags) {
          const tag = String(t).trim();
          if (tag) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
        }
      }
    }
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([t]) => t);
  } catch {
    return [];
  }
}

export async function subscribeNewsletter(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return false;
  try {
    const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db
      .insert(newsletterSubscribers)
      .values({
        id: subId,
        email: cleanEmail,
        active: true,
      })
      .onConflictDoNothing();
    return true;
  } catch (error) {
    console.error('[db] subscribeNewsletter failed', error);
    return false;
  }
}

export async function unsubscribeNewsletter(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return false;
  try {
    await db
      .update(newsletterSubscribers)
      .set({ active: false })
      .where(eq(newsletterSubscribers.email, cleanEmail));
    return true;
  } catch (error) {
    console.error('[db] unsubscribeNewsletter failed', error);
    return false;
  }
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
  const key = `highlights:${limit}`;
  try {
    return await cachedRead(key, 60_000, async () => {
      const rows = await db
        .select()
        .from(highlights)
        .where(eq(highlights.active, true))
        .orderBy(highlights.sortOrder)
        .limit(limit);

      return rows.map((h) => ({
        $id: h.id,
        tag: h.category ?? 'labarai',
        title: h.title,
        copy: h.subtitle ?? '',
        icon: 'trend',
        accent: '#10b981',
        gradient: '',
        link: h.link ?? undefined,
        order: h.sortOrder,
        active: h.active,
      }));
    });
  } catch (error) {
    console.error('[db] getHighlights failed', error);
    return staleOr<HomepageHighlight[]>(key, []);
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
  const key = `hpstats:${limit}`;
  try {
    return await cachedRead(key, 60_000, async () => {
      const rows = await db
        .select()
        .from(homepageStats)
        .where(eq(homepageStats.active, true))
        .orderBy(homepageStats.sortOrder)
        .limit(limit);

      return rows.map((s) => ({
        $id: s.id,
        label: s.label,
        value: Number(s.value) || 0,
        suffix: s.suffix ?? '',
        icon: 'article',
        order: s.sortOrder,
        active: s.active,
      }));
    });
  } catch (error) {
    console.error('[db] getHomepageStats failed', error);
    return staleOr<HomepageStat[]>(key, []);
  }
}

export interface SportsData {
  $id?: string;
  liveMatches: unknown[];
  standings: unknown[];
  fixtures: unknown[];
}

export async function getSportsData(): Promise<SportsData | null> {
  const key = 'sports';
  try {
    return await cachedRead(key, 60_000, async () => {
      const rows = await db.select().from(sportsData).limit(1);
      if (!rows.length) return null;
      const doc = rows[0];
      return {
        $id: doc.id,
        liveMatches: Array.isArray(doc.liveMatches) ? doc.liveMatches : [],
        standings: Array.isArray(doc.standings) ? doc.standings : [],
        fixtures: Array.isArray(doc.upcomingFixtures) ? doc.upcomingFixtures : [],
      };
    });
  } catch (error) {
    console.error('[db] getSportsData failed', error);
    return staleOr<SportsData | null>(key, null);
  }
}

export async function getSettings(limit = 100): Promise<Record<string, string>> {
  const key = 'settings';
  try {
    return await cachedRead(key, 60_000, async () => {
      const rows = await db.select().from(settings).limit(limit);
      const out: Record<string, string> = {};
      for (const r of rows) {
        out[r.key] = r.value;
      }
      return out;
    });
  } catch (error) {
    console.error('[db] getSettings failed', error);
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
  try {
    const rows = await db
      .select()
      .from(elections)
      .where(eq(elections.published, true))
      .limit(limit);

    return rows.map((e) => ({
      $id: e.id,
      name: e.name,
      fullName: e.fullName ?? '',
      date: e.date ?? '',
      type: e.type,
      status: e.status,
      electoralBody: e.electoralBody ?? 'INEC',
      description: e.description ?? '',
      image: '',
      published: e.published,
    }));
  } catch (error) {
    console.error('[db] getElections failed', error);
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
  try {
    const query = electionId
      ? db.select().from(candidates).where(eq(candidates.electionId, electionId)).limit(limit)
      : db.select().from(candidates).limit(limit);

    const rows = await query;
    return rows.map((c) => ({
      $id: c.id,
      electionId: c.electionId,
      name: c.name,
      party: c.party ?? '',
      position: 'Dan Takara',
      state: 'Najeriya',
      education: '',
      platform: c.manifesto ?? '',
      runningMate: c.runningMate ?? '',
      previousOffice: '',
      image: c.avatar ?? '',
      order: 0,
    }));
  } catch (error) {
    console.error('[db] getCandidates failed', error);
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
  try {
    const query = electionId
      ? db.select().from(electionResults).where(eq(electionResults.electionId, electionId)).limit(limit)
      : db.select().from(electionResults).limit(limit);

    const rows = await query;
    return rows.map((r) => ({
      $id: r.id,
      electionId: r.electionId,
      state: r.state,
      region: 'Arewa',
      candidateVotes: { [r.candidateId]: Number(r.votes ?? 0) },
      met25Threshold: [],
      winner: '',
      governor: '',
      senate: {},
      registeredVoters: 0,
      accreditedVoters: 0,
      validVotes: Number(r.votes ?? 0),
      rejectedVotes: 0,
    }));
  } catch (error) {
    console.error('[db] getResults failed', error);
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
  try {
    const query = electionId
      ? db.select().from(factChecks).where(eq(factChecks.electionId, electionId)).limit(limit)
      : db.select().from(factChecks).limit(limit);

    const rows = await query;
    return rows.map((f) => ({
      $id: f.id,
      electionId: f.electionId ?? '',
      claim: f.claim,
      claimant: f.claimant ?? '',
      claimantParty: '',
      verdict: f.verdict,
      analysis: f.explanation ?? '',
      source: f.sources ?? '',
      date: f.date ?? '',
      relatedArticleId: f.articleId ?? undefined,
    }));
  } catch (error) {
    console.error('[db] getFactChecks failed', error);
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
  try {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.active, true))
      .limit(limit);

    return rows.map((u, i) => ({
      $id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      category: 'Edita',
      status: u.active ? 'active' : 'inactive',
      bio: u.bio ?? '',
      image: u.avatar ?? '',
      order: i,
    }));
  } catch (error) {
    console.error('[db] getStaff failed', error);
    return [];
  }
}

export async function getRecommendedArticles(
  currentArticle: Article | Record<string, unknown>,
  limit = 4,
): Promise<Article[]> {
  const currentId = String(
    (currentArticle as Article).$id ??
      (currentArticle as Article).id ??
      (currentArticle as Record<string, unknown>).$id ??
      (currentArticle as Record<string, unknown>).id ??
      '',
  );
  const currentTags = new Set(
    ((currentArticle as Article).tags ?? []).map((t) => String(t).trim().toLowerCase()),
  );
  const currentSection = (currentArticle as Article).section;
  const currentPillar = (currentArticle as Article).pillar;

  const all = await getArticles(30);
  const candidatesList = all.filter((a) => String(a.$id ?? a.id) !== currentId);

  const scored = candidatesList.map((a) => {
    let score = 0;
    for (const t of a.tags ?? []) {
      if (currentTags.has(String(t).trim().toLowerCase())) score += 3;
    }
    if (a.section && a.section === currentSection) score += 2;
    if (a.pillar && a.pillar === currentPillar) score += 1;
    if (a.$createdAt) {
      const ageDays = (Date.now() - new Date(a.$createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays <= 7) score += 1;
    }
    return { article: a, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.article);
}
