export interface UploadedMedia {
  fileId: string;
  url: string;
}

/**
 * Upload a file from the browser.
 *
 * Preferred path is a presigned PUT straight to R2, which bypasses Heroku's
 * 30MB request-body limit. If storage is not configured the presign endpoint
 * answers 503 and we fall back to the legacy multipart route so small uploads
 * still work in a partially configured environment.
 */
export async function uploadMediaFile(file: File): Promise<UploadedMedia> {
  const presign = await fetch('/api/admin/media/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      size: file.size,
    }),
  });

  if (presign.ok) {
    const signed = (await presign.json()) as {
      uploadUrl: string;
      key: string;
      url: string;
    };

    const put = await fetch(signed.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    if (!put.ok) throw new Error('Direct upload to R2 failed');

    return { fileId: signed.key, url: signed.url };
  }

  if (presign.status !== 503) {
    const data = (await presign.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || 'Upload failed');
  }

  const form = new FormData();
  form.set('file', file);
  const res = await fetch('/api/admin/media', { method: 'POST', body: form });
  const data = (await res.json().catch(() => ({}))) as {
    fileId?: string;
    url?: string;
    message?: string;
  };

  if (!res.ok || !data.url) throw new Error(data.message || 'Upload failed');

  return { fileId: data.fileId ?? '', url: data.url };
}
