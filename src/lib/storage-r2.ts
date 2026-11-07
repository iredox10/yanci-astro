import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let s3Client: S3Client | null = null;

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME &&
      process.env.R2_PUBLIC_URL,
  );
}

export function getR2Client(): S3Client {
  if (s3Client) return s3Client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('[R2] Missing Cloudflare R2 configuration credentials.');
  }

  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3Client;
}

export function getR2PublicUrl(key: string): string {
  const customUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');
  if (!customUrl) {
    throw new Error('[R2] R2_PUBLIC_URL is not set. Configure a public bucket domain.');
  }
  return `${customUrl}/${key}`;
}

export async function uploadToR2(
  key: string,
  buffer: Buffer | Uint8Array,
  contentType: string,
): Promise<{ key: string; url: string }> {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;

  if (!bucket) {
    throw new Error('[R2] R2_BUCKET_NAME is not set.');
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  });

  await client.send(command);

  return {
    key,
    url: getR2PublicUrl(key),
  };
}

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  webm: 'video/webm',
};

function mimeFor(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXTENSION[ext] ?? 'application/octet-stream';
}

export async function createPresignedUpload(
  key: string,
  contentType: string,
): Promise<{ uploadUrl: string; key: string; url: string }> {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    throw new Error('[R2] R2_BUCKET_NAME is not set.');
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  });

  const uploadUrl = await getSignedUrl(getR2Client(), command, { expiresIn: 300 });

  return { uploadUrl, key, url: getR2PublicUrl(key) };
}

export async function deleteFromR2(key: string): Promise<boolean> {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;

  if (!bucket) return false;

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    await client.send(command);
    return true;
  } catch (error) {
    console.error(`[R2] Failed to delete file ${key}`, error);
    return false;
  }
}

export async function listR2Files(limit = 50): Promise<Array<{
  id: string;
  name: string;
  sizeOriginal: number;
  mimeType: string;
  createdAt: string;
  url: string;
}>> {
  if (!isR2Configured()) return [];
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) return [];

  try {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      MaxKeys: limit,
    });
    const res = await client.send(command);
    return (res.Contents || []).map((item) => {
      const key = item.Key || '';
      return {
        id: key,
        name: key.replace(/^uploads\//, ''),
        sizeOriginal: item.Size || 0,
        mimeType: mimeFor(key),
        createdAt: item.LastModified ? item.LastModified.toISOString() : new Date().toISOString(),
        url: getR2PublicUrl(key),
      };
    });
  } catch (error) {
    console.error('[R2] listR2Files failed', error);
    return [];
  }
}
