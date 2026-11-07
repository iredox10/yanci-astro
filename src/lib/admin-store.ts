import crypto from 'node:crypto';
import { eq, and, desc } from 'drizzle-orm';
import { db, articles, articleRevisions } from '../db';

let _lastAdminStoreError: string | null = null;

export function getLastAdminStoreError(): string | null {
  return _lastAdminStoreError;
}

export async function articleExistsByHeadline(headline: string): Promise<boolean> {
  if (!headline) return false;
  try {
    const rows = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.headline, headline))
      .limit(1);
    return rows.length > 0;
  } catch (error) {
    console.error('[admin-store] articleExistsByHeadline failed', error);
    return false;
  }
}

export async function adminCreateArticle(data: Record<string, unknown>): Promise<string | null> {
  try {
    const id = String(data.id || data.$id || `art_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`);

    const headline = String(data.headline ?? '');
    const kicker = data.kicker ? String(data.kicker) : undefined;
    const trail = data.trail ? String(data.trail) : undefined;
    const body = String(data.body ?? '');
    const image = data.image ? String(data.image) : undefined;
    const videoUrl = data.videoUrl ? String(data.videoUrl) : undefined;
    const pillar = String(data.pillar ?? 'news');
    const section = String(data.section ?? 'headlines');
    const type = String(data.type ?? 'standard');
    const author = String(data.author ?? 'Yanci');
    const isLive = Boolean(data.isLive);
    const status = String(data.status ?? 'draft');
    const publishAt = data.publishAt ? new Date(String(data.publishAt)) : undefined;
    const slug = data.slug ? String(data.slug) : undefined;
    const metaTitle = data.metaTitle ? String(data.metaTitle) : undefined;
    const metaDescription = data.metaDescription ? String(data.metaDescription) : undefined;
    const isSensitive = Boolean(data.isSensitive);
    const imageFocalX = typeof data.imageFocalX === 'number' ? data.imageFocalX : 50;
    const imageFocalY = typeof data.imageFocalY === 'number' ? data.imageFocalY : 50;
    const format = data.format ? String(data.format) : undefined;
    const isBreaking = Boolean(data.is_breaking ?? data.isBreaking);
    const breakingUntil = data.breaking_until ? new Date(String(data.breaking_until)) : undefined;
    const reviewStatus = String(data.review_status ?? data.reviewStatus ?? 'pending');
    const sourceUrl = data.source_url ? String(data.source_url) : undefined;
    const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];

    await db.insert(articles).values({
      id,
      headline,
      kicker,
      trail,
      body,
      image,
      videoUrl,
      pillar,
      section,
      type,
      author,
      isLive,
      status,
      publishAt,
      slug,
      metaTitle,
      metaDescription,
      isSensitive,
      imageFocalX,
      imageFocalY,
      format,
      isBreaking,
      breakingUntil,
      reviewStatus,
      sourceUrl,
      tags,
    });

    _lastAdminStoreError = null;
    return id;
  } catch (error: any) {
    _lastAdminStoreError = error?.message || String(error);
    console.error('[admin-store] createArticle failed', error);
    return null;
  }
}

export async function adminUpdateArticle(
  id: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  try {
    const payload: Record<string, any> = { updatedAt: new Date() };

    if (data.headline !== undefined) payload.headline = String(data.headline);
    if (data.kicker !== undefined) payload.kicker = data.kicker ? String(data.kicker) : null;
    if (data.trail !== undefined) payload.trail = data.trail ? String(data.trail) : null;
    if (data.body !== undefined) payload.body = String(data.body);
    if (data.image !== undefined) payload.image = data.image ? String(data.image) : null;
    if (data.videoUrl !== undefined) payload.videoUrl = data.videoUrl ? String(data.videoUrl) : null;
    if (data.pillar !== undefined) payload.pillar = String(data.pillar);
    if (data.section !== undefined) payload.section = String(data.section);
    if (data.type !== undefined) payload.type = String(data.type);
    if (data.author !== undefined) payload.author = String(data.author);
    if (data.isLive !== undefined) payload.isLive = Boolean(data.isLive);
    if (data.liveUpdates !== undefined) payload.liveUpdates = data.liveUpdates;
    if (data.status !== undefined) payload.status = String(data.status);
    if (data.publishAt !== undefined) payload.publishAt = data.publishAt ? new Date(String(data.publishAt)) : null;
    if (data.slug !== undefined) payload.slug = data.slug ? String(data.slug) : null;
    if (data.metaTitle !== undefined) payload.metaTitle = data.metaTitle ? String(data.metaTitle) : null;
    if (data.metaDescription !== undefined) payload.metaDescription = data.metaDescription ? String(data.metaDescription) : null;
    if (data.isSensitive !== undefined) payload.isSensitive = Boolean(data.isSensitive);
    if (data.imageFocalX !== undefined) payload.imageFocalX = Number(data.imageFocalX);
    if (data.imageFocalY !== undefined) payload.imageFocalY = Number(data.imageFocalY);
    if (data.format !== undefined) payload.format = data.format ? String(data.format) : null;
    if (data.is_breaking !== undefined) payload.isBreaking = Boolean(data.is_breaking);
    if (data.breaking_until !== undefined) payload.breakingUntil = data.breaking_until ? new Date(String(data.breaking_until)) : null;
    if (data.review_status !== undefined) payload.reviewStatus = String(data.review_status);
    if (data.source_url !== undefined) payload.sourceUrl = data.source_url ? String(data.source_url) : null;
    if (data.tags !== undefined) payload.tags = Array.isArray(data.tags) ? data.tags.map(String) : [];

    await db.update(articles).set(payload).where(eq(articles.id, id));
    _lastAdminStoreError = null;
    return true;
  } catch (error: any) {
    _lastAdminStoreError = error?.message || String(error);
    console.error('[admin-store] updateArticle failed', error);
    return false;
  }
}

export async function adminDeleteArticle(id: string): Promise<boolean> {
  try {
    await db.delete(articles).where(eq(articles.id, id));
    return true;
  } catch (error) {
    console.error('[admin-store] deleteArticle failed', error);
    return false;
  }
}

export async function getAutofetchDrafts(limit = 20): Promise<Record<string, unknown>[]> {
  try {
    const rows = await db
      .select()
      .from(articles)
      .where(and(eq(articles.author, 'AI Fetcher'), eq(articles.status, 'draft')))
      .orderBy(desc(articles.createdAt))
      .limit(Math.min(limit, 50));
    return rows.map((r) => ({ ...r, $id: r.id }));
  } catch (error) {
    console.error('[admin-store] getAutofetchDrafts failed', error);
    return [];
  }
}

export async function createRevision(
  articleId: string,
  previous: unknown,
  editorName: string,
): Promise<void> {
  try {
    const revId = `rev_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    await db.insert(articleRevisions).values({
      id: revId,
      articleId,
      author: editorName,
      snapshot: typeof previous === 'object' && previous !== null ? previous : { raw: previous },
    });
  } catch (error) {
    console.error('[admin-store] createRevision failed', error);
  }
}
