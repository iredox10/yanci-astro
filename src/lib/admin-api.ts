import type { APIRoute } from 'astro';
import { requireUser, hasRole } from '@lib/auth';
import {
  adminCreateCollectionDoc,
  adminUpdateCollectionDoc,
  adminDeleteCollectionDoc,
  type CollectionKey,
} from '@lib/admin-collections';
import { sanitizePlainText } from '@lib/sanitize';

/**
 * Shared REST handler for simple admin CRUD collections. Each collection gets
 * a thin route file (`/api/admin/<name>/[id].ts`) that delegates here with its
 * own field whitelist; nothing from the client is ever stored raw.
 */

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export type FieldSpec = { key: string; type: 'string' | 'number' | 'boolean' | 'json' | 'string[]' };

export function cleanFields(
  body: Record<string, unknown>,
  fields: FieldSpec[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const raw = body[f.key];
    if (raw === undefined) continue;
    switch (f.type) {
      case 'string':
        out[f.key] = sanitizePlainText(String(raw), 2000);
        break;
      case 'number': {
        const n = Number(raw);
        out[f.key] = Number.isFinite(n) ? n : 0;
        break;
      }
      case 'boolean':
        out[f.key] = Boolean(raw);
        break;
      case 'json': {
        try {
          out[f.key] = typeof raw === 'string' ? JSON.stringify(JSON.parse(raw)) : JSON.stringify(raw);
        } catch {
          out[f.key] = null;
        }
        break;
      }
      case 'string[]':
        out[f.key] = Array.isArray(raw)
          ? raw.map((x) => sanitizePlainText(String(x), 200))
          : [];
        break;
    }
  }
  return out;
}

export function makeCrudHandler(
  key: CollectionKey,
  fields: FieldSpec[],
  minRole: 'author' | 'editor' | 'admin' = 'editor',
): { POST: APIRoute; PUT: APIRoute; DELETE: APIRoute } {
  const POST: APIRoute = async ({ request }) => {
    const auth = await requireUser(request);
    if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
    if (!hasRole(auth.user, minRole)) return json({ ok: false, message: 'Forbidden' }, 403);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, message: 'Bad JSON' }, 400);
    }
    const cleaned = cleanFields(body, fields);
    const id = await adminCreateCollectionDoc(key, cleaned);
    if (!id) return json({ ok: false, message: 'Create failed' }, 503);
    return json({ ok: true, id }, 201);
  };

  const PUT: APIRoute = async ({ request, params }) => {
    const auth = await requireUser(request);
    if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
    if (!hasRole(auth.user, minRole)) return json({ ok: false, message: 'Forbidden' }, 403);

    const id = params.id;
    if (!id) return json({ ok: false, message: 'Missing id' }, 422);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, message: 'Bad JSON' }, 400);
    }
    const cleaned = cleanFields(body, fields);
    const ok = await adminUpdateCollectionDoc(key, id, cleaned);
    if (!ok) return json({ ok: false, message: 'Update failed' }, 503);
    return json({ ok: true });
  };

  const DELETE: APIRoute = async ({ request, params }) => {
    const auth = await requireUser(request);
    if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
    if (auth.user.role !== 'super_admin' && auth.user.role !== 'managing_editor') {
      return json({ ok: false, message: 'Forbidden: only senior editors can delete' }, 403);
    }
    const id = params.id;
    if (!id) return json({ ok: false, message: 'Missing id' }, 422);
    const ok = await adminDeleteCollectionDoc(key, id);
    if (!ok) return json({ ok: false, message: 'Delete failed' }, 503);
    return json({ ok: true });
  };

  return { POST, PUT, DELETE };
}
