import type { APIRoute } from 'astro';
import { Client, Databases } from 'node-appwrite';
import { requireUser, hasRole } from '@lib/auth';
import { sanitizePlainText } from '@lib/sanitize';
import { APPWRITE_API_KEY, APPWRITE_COLLECTION_REVISIONS } from 'astro:env/server';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT_ID,
  PUBLIC_APPWRITE_DATABASE_ID,
} from 'astro:env/client';

export const prerender = false;

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

interface RevisionDocShape {
  $id?: string;
  articleId?: unknown;
  title?: unknown;
  changedFields?: unknown;
  fullSnapshot?: unknown;
  authorName?: unknown;
  createdAt?: unknown;
  $createdAt?: string;
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

function parseSnapshotObject(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === 'object') return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return null;
}

function toDetail(doc: RevisionDocShape): Record<string, unknown> {
  return {
    id: doc.$id ?? '',
    articleId: String(doc.articleId ?? ''),
    title: String(doc.title ?? ''),
    changedFields: parseJsonArray(doc.changedFields),
    authorName: String(doc.authorName ?? ''),
    createdAt: String(doc.createdAt ?? doc.$createdAt ?? ''),
    snapshot: parseSnapshotObject(doc.fullSnapshot),
  };
}

/**
 * GET  /api/admin/revisions/:id — one revision with its full snapshot.
 * POST /api/admin/revisions/:id — same payload, restore semantics; the client
 * applies the snapshot to the editor form via the normal article-update API.
 */
async function handle(request: Request, id: string | undefined): Promise<Response> {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'editor')) return json({ ok: false, message: 'Forbidden' }, 403);

  const env = revisionsDb();
  if (!env) return json({ ok: false, message: 'Unavailable' }, 503);

  const revisionId = sanitizePlainText(id ?? '', 64);
  if (!revisionId) return json({ ok: false, message: 'Missing id' }, 422);

  try {
    const doc = (await env.db.getDocument({
      databaseId: env.databaseId,
      collectionId: env.collectionId,
      documentId: revisionId,
    })) as unknown as RevisionDocShape;
    return json({ ok: true, revision: toDetail(doc) });
  } catch (error) {
    console.error('[admin/revisions] fetch failed', error);
    return json({ ok: false, message: 'Ba a samu wannan sigar ba' }, 404);
  }
}

export const GET: APIRoute = async ({ request, params }) => handle(request, params.id);

export const POST: APIRoute = async ({ request, params }) => handle(request, params.id);
