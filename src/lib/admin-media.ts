import {
  isR2Configured,
  uploadToR2,
  deleteFromR2,
  getR2PublicUrl,
  listR2Files,
} from './storage-r2';

export const MEDIA_MIME_ALLOWLIST = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
]);

export const MAX_MEDIA_BYTES = 50 * 1024 * 1024; // 50MB

export function isMediaConfigured(): boolean {
  return isR2Configured();
}

export function mediaFileUrl(fileId?: string): string {
  if (!fileId) return '';
  if (fileId.startsWith('http://') || fileId.startsWith('https://')) {
    return fileId;
  }
  return getR2PublicUrl(fileId);
}

export async function uploadMedia(
  blob: ArrayBuffer,
  mimeType: string,
  fileName: string,
): Promise<{ fileId: string; url: string } | null> {
  if (!isMediaConfigured()) {
    console.warn('[media] R2 storage is not configured.');
    return null;
  }

  const safeExt = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '';
  const safeBase = fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-z0-9_-]/gi, '-')
    .toLowerCase()
    .slice(0, 50);

  const fileKey = `uploads/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${safeBase}${safeExt}`;

  try {
    const buffer = Buffer.from(blob);
    const result = await uploadToR2(fileKey, buffer, mimeType);
    return { fileId: result.key, url: result.url };
  } catch (error) {
    console.error('[media] R2 upload failed', error);
    return null;
  }
}

export async function deleteMedia(fileKey: string): Promise<boolean> {
  if (!isMediaConfigured()) return false;
  return deleteFromR2(fileKey);
}

export async function listMediaFiles(limit = 50) {
  if (!isMediaConfigured()) return [];
  return listR2Files(limit);
}
