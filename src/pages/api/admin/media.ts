import type { APIRoute } from 'astro';
import { requireUser, hasRole } from '@lib/auth';
import { uploadMedia, MEDIA_MIME_ALLOWLIST, MAX_MEDIA_BYTES } from '@lib/admin-media';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'editor')) return json({ ok: false, message: 'Forbidden' }, 403);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, message: 'Expected multipart form data' }, 400);
  }

  const file = form.get('file');
  if (!(file instanceof File)) return json({ ok: false, message: 'Missing file' }, 422);

  const mime = file.type || 'application/octet-stream';
  if (!MEDIA_MIME_ALLOWLIST.has(mime)) {
    return json({ ok: false, message: `Unsupported file type: ${mime}` }, 415);
  }
  if (file.size > MAX_MEDIA_BYTES) {
    return json({ ok: false, message: 'File too large (max 50MB)' }, 413);
  }

  const uploaded = await uploadMedia(await file.arrayBuffer(), mime, file.name);
  if (!uploaded) return json({ ok: false, message: 'Upload failed' }, 503);

  return json({ ok: true, fileId: uploaded.fileId, url: uploaded.url }, 201);
};
