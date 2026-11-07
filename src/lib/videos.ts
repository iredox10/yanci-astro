import { db } from '@db';
import { videos } from '@db/schema';
import { eq, asc, desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { sanitizeImageUrl, sanitizePlainText } from '@lib/sanitize';
import { parseYouTubeId, youTubeThumbnail } from '@lib/youtube';

export const VIDEOS_COLLECTION_ID = 'videos';

export interface VideoDoc {
  $id?: string;
  title: string;
  url: string;
  youtubeId: string;
  description: string;
  thumbnail: string;
  order: number;
  published: boolean;
}

export interface CleanedVideo {
  title: string;
  url: string;
  youtubeId: string;
  description: string;
  thumbnail: string;
  order: number | null;
  published: boolean;
}

export interface VideoPatch {
  title?: string;
  url?: string;
  youtubeId?: string;
  description?: string;
  thumbnail?: string;
  order?: number;
  published?: boolean;
}

function toVideo(row: typeof videos.$inferSelect): VideoDoc {
  const url = row.url ?? '';
  const stored = row.youtubeId ?? '';
  const youtubeId = parseYouTubeId(stored || url) ?? stored ?? '';
  const thumbnail = row.thumbnail || (youtubeId ? youTubeThumbnail(youtubeId) : '');
  return {
    $id: row.id,
    title: row.title ?? '',
    url,
    youtubeId,
    description: row.description ?? '',
    thumbnail,
    order: row.order ?? 0,
    published: row.published !== false,
  };
}

export function cleanVideoInput(raw: Record<string, unknown>): CleanedVideo | null {
  const url = sanitizePlainText(String(raw.url ?? ''), 500);
  const youtubeId = parseYouTubeId(url);
  if (!youtubeId) return null;
  const thumbnailRaw = raw.thumbnail === undefined ? '' : String(raw.thumbnail);
  const thumbnail = sanitizeImageUrl(thumbnailRaw) ?? '';
  const orderRaw = Number(raw.order);
  const publishedRaw = raw.published;
  return {
    title: sanitizePlainText(String(raw.title ?? ''), 200),
    url,
    youtubeId,
    description: sanitizePlainText(String(raw.description ?? ''), 1000),
    thumbnail: thumbnail || youTubeThumbnail(youtubeId),
    order: Number.isFinite(orderRaw) ? Math.trunc(orderRaw) : null,
    published:
      publishedRaw === undefined ? true : !(publishedRaw === false || publishedRaw === 'false'),
  };
}

async function nextOrder(): Promise<number> {
  if (!db) return 0;
  try {
    const [highest] = await db
      .select({ order: videos.order })
      .from(videos)
      .orderBy(desc(videos.order))
      .limit(1);
    return highest ? (highest.order ?? 0) + 1 : 0;
  } catch {
    return 0;
  }
}

export async function listVideos(
  options?: { publishedOnly?: boolean; limit?: number },
): Promise<VideoDoc[]> {
  if (!db) return [];
  try {
    const query = db.select().from(videos);
    if (options?.publishedOnly) {
      query.where(eq(videos.published, true));
    }
    const limit = Math.min(options?.limit ?? 200, 100);
    const rows = await query.orderBy(asc(videos.order)).limit(limit);
    return rows.map(toVideo);
  } catch (error) {
    console.error('[videos] list failed', error);
    return [];
  }
}

export async function getVideo(id: string): Promise<VideoDoc | null> {
  if (!db) return null;
  try {
    const [row] = await db.select().from(videos).where(eq(videos.id, id)).limit(1);
    return row ? toVideo(row) : null;
  } catch {
    return null;
  }
}

export async function createVideo(input: CleanedVideo): Promise<VideoDoc | null> {
  if (!db) return null;
  try {
    const order = input.order ?? (await nextOrder());
    const [created] = await db
      .insert(videos)
      .values({
        id: randomUUID(),
        title: input.title,
        url: input.url,
        youtubeId: input.youtubeId,
        description: input.description,
        thumbnail: input.thumbnail,
        order,
        published: input.published,
      })
      .returning();
    return created ? toVideo(created) : null;
  } catch (error) {
    console.error('[videos] create failed', error);
    return null;
  }
}

export async function updateVideo(id: string, patch: VideoPatch): Promise<VideoDoc | null> {
  if (!db) return null;
  const updateData: Partial<typeof videos.$inferInsert> = {};
  if (patch.title !== undefined) updateData.title = patch.title;
  if (patch.url !== undefined) updateData.url = patch.url;
  if (patch.youtubeId !== undefined) updateData.youtubeId = patch.youtubeId;
  if (patch.description !== undefined) updateData.description = patch.description;
  if (patch.thumbnail !== undefined) updateData.thumbnail = patch.thumbnail;
  if (patch.order !== undefined) updateData.order = patch.order;
  if (patch.published !== undefined) updateData.published = patch.published;

  if (Object.keys(updateData).length === 0) return null;

  try {
    const [updated] = await db
      .update(videos)
      .set(updateData)
      .where(eq(videos.id, id))
      .returning();
    return updated ? toVideo(updated) : null;
  } catch (error) {
    console.error('[videos] update failed', error);
    return null;
  }
}

export async function reorderVideos(orderedIds: string[]): Promise<boolean> {
  if (!db || orderedIds.length === 0) return false;
  try {
    await Promise.all(
      orderedIds.map((id, index) =>
        db!.update(videos).set({ order: index }).where(eq(videos.id, id)),
      ),
    );
    return true;
  } catch (error) {
    console.error('[videos] reorder failed', error);
    return false;
  }
}

export async function deleteVideo(id: string): Promise<boolean> {
  if (!db) return false;
  try {
    await db.delete(videos).where(eq(videos.id, id));
    return true;
  } catch (error) {
    console.error('[videos] delete failed', error);
    return false;
  }
}
