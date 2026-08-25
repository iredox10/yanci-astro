import { useMemo, useRef, useState } from 'react';

export interface MediaFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
  url: string;
}

interface Props {
  initialFiles: MediaFile[];
}

const ACCEPTED = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm';
const MAX_BYTES = 50 * 1024 * 1024;

const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exp;
  return `${exp === 0 || value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[exp]}`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '\u2014' : day.format(date);
}

async function apiError(res: Response): Promise<Error> {
  let message = `Request failed (${res.status})`;
  try {
    const data = (await res.json()) as { message?: unknown };
    if (typeof data.message === 'string' && data.message) message = data.message;
  } catch {
    // keep the status-based message
  }
  if (res.status === 403) return new Error(`Permission denied (403): ${message}`);
  return new Error(message);
}

function IconUpload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M12 16V4m0 0L7 9m5-5 5 5" />
      <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <rect x="9" y="9" width="12" height="12" rx="1" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
      <path d="M10 11v6m4-6v6" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function MediaManager({ initialFiles }: Props) {
  const [files, setFiles] = useState<MediaFile[]>(initialFiles);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => f.name.toLowerCase().includes(q));
  }, [files, search]);

  async function handleUpload(file: File) {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError('File too large (max 50MB).');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.set('file', file);
      const res = await fetch('/api/admin/media', { method: 'POST', body: form });
      if (!res.ok) throw await apiError(res);
      const data = (await res.json()) as { fileId: string; url: string };
      setFiles((prev) => [
        {
          id: data.fileId,
          name: file.name,
          size: file.size,
          mimeType: file.type,
          createdAt: new Date().toISOString(),
          url: data.url,
        },
        ...prev,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Shin kana son share wannan hoton? Ba za a iya dawo da shi ba.')) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/media/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw await apiError(res);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file.');
    } finally {
      setBusyId(null);
    }
  }

  async function copyUrl(file: MediaFile) {
    setError(null);
    try {
      await navigator.clipboard.writeText(file.url);
      setCopiedId(file.id);
      window.setTimeout(() => setCopiedId((current) => (current === file.id ? null : current)), 2000);
    } catch {
      setError('Could not copy the URL.');
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-yanci-primary/40">
            <IconSearch />
          </span>
          <input
            type="text"
            placeholder="Nemo hoto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-yanci-primary/25 bg-white py-2 pl-9 pr-3 text-sm text-yanci-dark placeholder:text-yanci-primary/40 focus:border-yanci-primary/60 focus:outline-none"
          />
        </div>
        <label
          className={`inline-flex cursor-pointer items-center justify-center gap-2 border border-yanci-primary px-4 py-2 text-sm font-bold transition-colors ${
            uploading
              ? 'cursor-wait bg-yanci-primary/50 text-yanci-paper'
              : 'bg-yanci-primary text-yanci-paper hover:bg-yanci-primary/90'
          }`}
        >
          {uploading ? <Spinner /> : <IconUpload />}
          Loda Hoto
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
              else if (inputRef.current) inputRef.current.value = '';
            }}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-3 border border-yanci-red/30 bg-yanci-red/5 px-4 py-2 text-sm text-yanci-red">
          {error}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="mt-6 border border-yanci-primary/15 bg-white/60 px-4 py-16 text-center">
          <p className="text-sm text-yanci-primary/50">
            {search.trim() ? 'Babu sakamako ga bincinken.' : 'Babu hotuna a dakin ajiya.'}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((file) => (
            <figure key={file.id} className="group overflow-hidden border border-yanci-primary/15 bg-white/60">
              <div className="relative aspect-square bg-yanci-primary/10">
                {file.mimeType.startsWith('video/') ? (
                  <video src={file.url} preload="metadata" muted playsInline className="h-full w-full object-cover" />
                ) : (
                  <img src={file.url} alt={file.name} loading="lazy" className="h-full w-full object-cover" />
                )}
                <div className="absolute inset-0 hidden items-center justify-center gap-2 bg-black/60 group-hover:flex">
                  <button
                    type="button"
                    onClick={() => void copyUrl(file)}
                    title="Kwafi URL"
                    className="rounded-full bg-white p-2 text-yanci-dark transition-colors hover:bg-white/90"
                  >
                    {copiedId === file.id ? <IconCheck /> : <IconCopy />}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(file.id)}
                    disabled={busyId === file.id}
                    title="Share"
                    className="rounded-full bg-white p-2 text-yanci-red transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    {busyId === file.id ? <Spinner /> : <IconTrash />}
                  </button>
                </div>
              </div>
              <figcaption className="p-3">
                <p className="truncate text-xs font-bold text-yanci-dark" title={file.name}>
                  {file.name}
                </p>
                <p className="mt-1 flex items-center justify-between text-[11px] text-yanci-primary/60">
                  <span>{formatBytes(file.size)}</span>
                  <span>{formatDate(file.createdAt)}</span>
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
