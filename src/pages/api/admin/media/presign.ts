import type { APIRoute } from 'astro';
import { requireUser, hasRole } from '@lib/auth';
import {
  isMediaConfigured,
  buildMediaKey,
  MEDIA_MIME_ALLOWLIST,
  MAX_MEDIA_BYTES,
} from '@lib/admin-media';
import { createPresignedUpload } from '@lib/storage-r2';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/**
 * POST /api/admin/media/presign
 *
 * Issues a short-lived presigned PUT URL so the browser can upload straight to
 * R2. Heroku's router rejects request bodies above 30MB, which is below our
 * media limit, so large files must never pass through the dyno.
 */
export const POST: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'editor')) return json({ ok: false, message: 'Forbidden' }, 403);

  if (!isMediaConfigured()) {
    return json({ ok: false, message: 'Storage not configured' }, 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const filename = typeof b.filename === 'string' ? b.filename : '';
  const contentType = typeof b.contentType === 'string' ? b.contentType : '';
  const size = Number(b.size);

  if (!filename || !MEDIA_MIME_ALLOWLIST.has(contentType)) {
    return json({ ok: false, message: `Unsupported file type: ${contentType}` }, 415);
  }
  if (!Number.isFinite(size) || size <= 0) {
    return json({ ok: false, message: 'Missing file size' }, 422);
  }
  if (size > MAX_MEDIA_BYTES) {
    return json({ ok: false, message: 'File too large (max 50MB)' }, 413);
  }

  try {
    const signed = await createPresignedUpload(buildMediaKey(filename), contentType);
    return json({ ok: true, ...signed }, 201);
  } catch (error) {
    console.error('[media] presign failed', error);
    return json({ ok: false, message: 'Could not prepare upload' }, 500);
  }
};
