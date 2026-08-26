import type { APIRoute } from 'astro';
import { requireUser, hasRole } from '@lib/auth';
import { cleanVideoInput, createVideo, listVideos } from '@lib/videos';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export const GET: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  return json({ ok: true, videos: await listVideos() });
};

export const POST: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'editor')) return json({ ok: false, message: 'Forbidden' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  const cleaned = cleanVideoInput(body);
  if (!cleaned) return json({ ok: false, message: 'Invalid YouTube URL' }, 422);

  const video = await createVideo(cleaned);
  if (!video) return json({ ok: false, message: 'Create failed' }, 503);
  return json({ ok: true, video }, 201);
};
