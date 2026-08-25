import type { APIRoute } from 'astro';
import { Client, Databases, ID, Query } from 'node-appwrite';
import { requireUser, hasRole } from '@lib/auth';
import { sanitizePlainText } from '@lib/sanitize';
import { APPWRITE_API_KEY, APPWRITE_COLLECTION_REVISIONS } from 'astro:env/server';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT_ID,
  PUBLIC_APPWRITE_DATABASE_ID,
} from 'astro:env/client';

export const prerender = false;

const FIELD_KEYS = [
  'headline',
  'kicker',
  'trail',
  'body',
  'image',
  'pillar',
  'section',
  'author',
  'slug',
  'isLive',
  'status',
  'publishAt',
  'isSensitive',
  'tags',
  'metaTitle',
  'metaDescription',
  'liveUpdates',
  'videoUrl',
] as const;

const MAX_SNAPSHOT_BYTES = 1_000_000;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

function revisionsDb(): { db: Databases; databaseId: string; collectionId: string } | null {
  if (
    !APPWRITE_API_KEY ||
    !PUBLIC_APPWRITE_ENDPOINT ||
    !PUBLIC_APPWRITE_PROJECT_ID ||
    !PUBLIC_APPWRITE_DATABASE_ID ||
    !APPWRITE_COLLECTION_REVISIONS
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
    collectionId: APPWRITE_COLLECTION_REVISIONS,
  };
}

function sanitizeChangedFields(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((f) => sanitizePlainText(String(f), 40))
    .filter((f): f is string => f.length > 0 && (FIELD_KEYS as readonly string[]).includes(f))
    .slice(0, 24);
}

/** Accept an object or a JSON string; always store canonical JSON or reject. */
function sanitizeSnapshot(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.stringify(JSON.parse(raw));
    } catch {
      return null;
    }
  }
  try {
    return JSON.stringify(raw);
  } catch {
    return null;
  }
}

function parseJsonArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((x) => String(x));
  if (typeof raw !== 'string') return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

/** GET /api/admin/revisions?articleId=… — revision summaries for one article, newest first. */
export const GET: APIRoute = async ({ request, url }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'editor')) return json({ ok: false, message: 'Forbidden' }, 403);

  const env = revisionsDb();
  if (!env) return json({ ok: false, message: 'Unavailable' }, 503);

  const articleId = sanitizePlainText(url.searchParams.get('articleId') ?? '', 64);
  if (!articleId) return json({ ok: false, message: 'Missing articleId' }, 422);

  try {
    const { documents } = await env.db.listDocuments({
      databaseId: env.databaseId,
      collectionId: env.collectionId,
      queries: [Query.equal('articleId', articleId), Query.orderDesc('$createdAt'), Query.limit(100)],
    });
    const revisions = (documents ?? []).map((doc) => ({
      id: doc.$id,
      articleId: String(doc.articleId ?? ''),
      title: String(doc.title ?? ''),
      changedFields: parseJsonArray(doc.changedFields),
      authorName: String(doc.authorName ?? ''),
      createdAt: String(doc.createdAt ?? doc.$createdAt ?? ''),
    }));
    return json({ ok: true, revisions });
  } catch (error) {
    console.error('[admin/revisions] list failed', error);
    return json({ ok: false, message: 'An kasa loda tarihi' }, 503);
  }
};

/** POST /api/admin/revisions — create a snapshot ({ articleId, title, changedFields, snapshot, authorName }). */
export const POST: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'editor')) return json({ ok: false, message: 'Forbidden' }, 403);

  const env = revisionsDb();
  if (!env) return json({ ok: false, message: 'Unavailable' }, 503);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  const articleId = sanitizePlainText(String(body.articleId ?? ''), 64);
  if (!articleId) return json({ ok: false, message: 'Missing articleId' }, 422);

  const fullSnapshot = sanitizeSnapshot(body.snapshot);
  if (!fullSnapshot) return json({ ok: false, message: 'Invalid snapshot' }, 422);
  if (fullSnapshot.length > MAX_SNAPSHOT_BYTES) return json({ ok: false, message: 'Snapshot too large' }, 413);

  try {
    const doc = await env.db.createDocument({
      databaseId: env.databaseId,
      collectionId: env.collectionId,
      documentId: ID.unique(),
      data: {
        articleId,
        title: sanitizePlainText(String(body.title ?? ''), 200),
        changedFields: JSON.stringify(sanitizeChangedFields(body.changedFields)),
        fullSnapshot,
        authorName: sanitizePlainText(String(body.authorName ?? ''), 120) || 'unknown',
        createdAt: new Date().toISOString(),
      },
      permissions: ['read("any")'],
    });
    return json({ ok: true, id: doc.$id }, 201);
  } catch (error) {
    console.error('[admin/revisions] create failed', error);
    return json({ ok: false, message: 'An kasa ajiye tarihi' }, 503);
  }
};
