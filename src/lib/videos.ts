import { Client, Databases, ID, Query } from 'node-appwrite';
import { APPWRITE_API_KEY } from 'astro:env/server';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT_ID,
  PUBLIC_APPWRITE_DATABASE_ID,
} from 'astro:env/client';
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

const READ_ANY = 'read("any")';

function store(): { db: Databases; databaseId: string } | null {
  if (
    !APPWRITE_API_KEY ||
    !PUBLIC_APPWRITE_ENDPOINT ||
    !PUBLIC_APPWRITE_PROJECT_ID ||
    !PUBLIC_APPWRITE_DATABASE_ID
  ) {
    return null;
  }
  const client = new Client()
    .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
    .setProject(PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);
  return { db: new Databases(client), databaseId: PUBLIC_APPWRITE_DATABASE_ID };
}

type VideoRaw = Record<string, unknown> & { $id: string };

function toVideo(doc: VideoRaw): VideoDoc {
  const url = String(doc.url ?? '');
  const stored = String(doc.youtubeId ?? '');
  const youtubeId = parseYouTubeId(stored || url) ?? '';
  const thumbnail = String(doc.thumbnail ?? '') || (youtubeId ? youTubeThumbnail(youtubeId) : '');
  return {
    $id: doc.$id,
    title: String(doc.title ?? ''),
    url,
    youtubeId,
    description: String(doc.description ?? ''),
    thumbnail,
    order: Number(doc.order ?? 0),
    published: doc.published !== false,
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

async function nextOrder(db: Databases, databaseId: string): Promise<number> {
  try {
    const { documents } = await db.listDocuments(databaseId, VIDEOS_COLLECTION_ID, [
      Query.orderDesc('order'),
      Query.limit(1),
    ]);
    return documents.length > 0 ? Number(documents[0].order ?? 0) + 1 : 0;
  } catch {
    return 0;
  }
}

export async function listVideos(
  options?: { publishedOnly?: boolean; limit?: number },
): Promise<VideoDoc[]> {
  const s = store();
  if (!s) return [];
  const queries = [Query.orderAsc('order'), Query.limit(Math.min(options?.limit ?? 200, 100))];
  if (options?.publishedOnly) queries.push(Query.equal('published', true));
  try {
    const { documents } = await s.db.listDocuments(s.databaseId, VIDEOS_COLLECTION_ID, queries);
    return (documents as unknown as VideoRaw[])
      .map(toVideo)
      .sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error('[videos] list failed', error);
    return [];
  }
}

export async function getVideo(id: string): Promise<VideoDoc | null> {
  const s = store();
  if (!s) return null;
  try {
    const doc = await s.db.getDocument(s.databaseId, VIDEOS_COLLECTION_ID, id);
    return toVideo(doc as unknown as VideoRaw);
  } catch {
    return null;
  }
}

export async function createVideo(input: CleanedVideo): Promise<VideoDoc | null> {
  const s = store();
  if (!s) return null;
  try {
    const order = input.order ?? (await nextOrder(s.db, s.databaseId));
    const doc = await s.db.createDocument(
      s.databaseId,
      VIDEOS_COLLECTION_ID,
      ID.unique(),
      {
        title: input.title,
        url: input.url,
        youtubeId: input.youtubeId,
        description: input.description,
        thumbnail: input.thumbnail,
        order,
        published: input.published,
      },
      [READ_ANY],
    );
    return toVideo(doc as unknown as VideoRaw);
  } catch (error) {
    console.error('[videos] create failed', error);
    return null;
  }
}

export async function updateVideo(id: string, patch: VideoPatch): Promise<VideoDoc | null> {
  const s = store();
  if (!s) return null;
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) data[key] = value;
  }
  if (Object.keys(data).length === 0) return null;
  try {
    const doc = await s.db.updateDocument(s.databaseId, VIDEOS_COLLECTION_ID, id, data);
    return toVideo(doc as unknown as VideoRaw);
  } catch (error) {
    console.error('[videos] update failed', error);
    return null;
  }
}

export async function reorderVideos(orderedIds: string[]): Promise<boolean> {
  const s = store();
  if (!s || orderedIds.length === 0) return false;
  try {
    await Promise.all(
      orderedIds.map((id, index) =>
        s.db.updateDocument(s.databaseId, VIDEOS_COLLECTION_ID, id, { order: index }),
      ),
    );
    return true;
  } catch (error) {
    console.error('[videos] reorder failed', error);
    return false;
  }
}

export async function deleteVideo(id: string): Promise<boolean> {
  const s = store();
  if (!s) return false;
  try {
    await s.db.deleteDocument(s.databaseId, VIDEOS_COLLECTION_ID, id);
    return true;
  } catch (error) {
    console.error('[videos] delete failed', error);
    return false;
  }
}
