import type { APIRoute } from 'astro';
import { Client, Storage } from 'node-appwrite';
import { APPWRITE_API_KEY } from 'astro:env/server';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT_ID,
  PUBLIC_APPWRITE_BUCKET_ID,
} from 'astro:env/client';
import { requireUser, hasRole } from '@lib/auth';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export const DELETE: APIRoute = async ({ request, params }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'editor')) return json({ ok: false, message: 'Forbidden' }, 403);

  const id = params.id;
  if (!id) return json({ ok: false, message: 'Missing id' }, 422);
  if (!APPWRITE_API_KEY || !PUBLIC_APPWRITE_BUCKET_ID) {
    return json({ ok: false, message: 'Storage not configured' }, 503);
  }

  try {
    const client = new Client()
      .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
      .setProject(PUBLIC_APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);
    const storage = new Storage(client);
    await storage.deleteFile({ bucketId: PUBLIC_APPWRITE_BUCKET_ID, fileId: id });
    return json({ ok: true });
  } catch (error) {
    console.error('[media] delete failed', error);
    const code = typeof error === 'object' && error !== null && 'code' in error ? (error as { code?: unknown }).code : null;
    if (code === 404) return json({ ok: false, message: 'File not found' }, 404);
    if (code === 401 || code === 403) return json({ ok: false, message: 'Storage access denied' }, 403);
    return json({ ok: false, message: 'Delete failed' }, 503);
  }
};
