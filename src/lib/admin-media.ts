import { Client, Storage, ID } from 'node-appwrite';
import { APPWRITE_API_KEY } from 'astro:env/server';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT_ID,
  PUBLIC_APPWRITE_BUCKET_ID,
} from 'astro:env/client';

export const MEDIA_MIME_ALLOWLIST = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
]);

export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;

export function isMediaConfigured(): boolean {
  return Boolean(
    APPWRITE_API_KEY &&
      PUBLIC_APPWRITE_ENDPOINT &&
      PUBLIC_APPWRITE_PROJECT_ID &&
      PUBLIC_APPWRITE_BUCKET_ID,
  );
}

export function mediaFileUrl(fileId: string): string {
  const base = PUBLIC_APPWRITE_ENDPOINT.replace(/\/$/, '');
  return `${base}/storage/buckets/${PUBLIC_APPWRITE_BUCKET_ID}/files/${fileId}/view`;
}

export async function uploadMedia(
  blob: ArrayBuffer,
  mimeType: string,
  fileName: string,
): Promise<{ fileId: string; url: string } | null> {
  if (!isMediaConfigured() || !PUBLIC_APPWRITE_BUCKET_ID) return null;
  const safeName = `${Date.now().toString(36)}-${(fileName.replace(/[^a-z0-9.-]/gi, '') || 'file').slice(0, 80)}`;
  try {
    const client = new Client()
      .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
      .setProject(PUBLIC_APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY ?? '');
    const storage = new Storage(client);
    const created = await storage.createFile(
      PUBLIC_APPWRITE_BUCKET_ID,
      ID.unique(),
      new File([blob], safeName, { type: mimeType }),
      [],
    );
    return { fileId: created.$id, url: mediaFileUrl(created.$id) };
  } catch (error) {
    console.error('[media] upload failed', error);
    return null;
  }
}