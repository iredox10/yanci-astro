import { useMemo, useState } from 'react';
import { parseYouTubeId, youTubeEmbedUrl, youTubeThumbnail } from '../../lib/youtube';
import type { VideoDoc } from '../../lib/videos';

interface Props {
  initialVideos: VideoDoc[];
  canDelete: boolean;
}

interface Draft {
  id: string | null;
  title: string;
  url: string;
  description: string;
  thumbnail: string;
  published: boolean;
}

interface VideoResponse {
  ok?: boolean;
  video?: VideoDoc;
  message?: string;
}

const EMPTY_DRAFT: Draft = {
  id: null,
  title: '',
  url: '',
  description: '',
  thumbnail: '',
  published: true,
};

const INPUT_CLASS =
  'w-full border border-yanci-primary/25 bg-white px-3 py-2 text-sm focus:border-yanci-accent focus:outline-none focus:ring-2 focus:ring-yanci-accent/40';
const LABEL_CLASS = 'mb-1 block text-xs font-bold uppercase tracking-wide text-yanci-primary/70';

function sortVideos(list: VideoDoc[]): VideoDoc[] {
  return [...list].sort((a, b) => a.order - b.order);
}

export default function VideoManager({ initialVideos, canDelete }: Props) {
  const [videos, setVideos] = useState<VideoDoc[]>(() => sortVideos(initialVideos));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedId = useMemo(() => (draft ? parseYouTubeId(draft.url) : null), [draft]);

  async function save() {
    if (!draft || busy) return;
    if (!draft.title.trim()) {
      setError('Take na bukata.');
      return;
    }
    if (!parsedId) {
      setError('Saka madaidaicin hanyar bidiyon YouTube.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(draft.id ? `/api/admin/videos/${draft.id}` : '/api/admin/videos', {
        method: draft.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          url: draft.url,
          description: draft.description,
          thumbnail: draft.thumbnail,
          published: draft.published,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as VideoResponse;
      if (!res.ok || !data.video) throw new Error(data.message ?? 'Ajiye bai yi nasara ba.');
      const saved = data.video;
      setVideos((prev) => {
        const next = draft.id
          ? prev.map((v) => (v.$id === saved.$id ? saved : v))
          : [...prev, saved];
        return sortVideos(next);
      });
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ajiye bai yi nasara ba.');
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    if (busy) return;
    const target = index + dir;
    if (target < 0 || target >= videos.length) return;
    const next = [...videos];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    const reordered = next.map((v, i) => ({ ...v, order: i }));
    setVideos(reordered);
    setError(null);
    try {
      const res = await fetch('/api/admin/videos/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: reordered.map((v) => v.$id) }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as VideoResponse;
        throw new Error(data.message ?? 'Tsara jeri bai yi nasara ba.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tsara jeri bai yi nasara ba.');
      window.location.reload();
    }
  }

  async function remove(video: VideoDoc) {
    if (!video.$id || busy) return;
    if (!window.confirm(`Goge bidiyon "${video.title}"? Ba za a iya dawo da shi ba.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/videos/${video.$id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as VideoResponse;
        throw new Error(data.message ?? 'Goge bai yi nasara ba.');
      }
      setVideos((prev) => prev.filter((v) => v.$id !== video.$id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Goge bai yi nasara ba.');
    } finally {
      setBusy(false);
    }
  }

  function openEdit(video: VideoDoc) {
    setError(null);
    setDraft({
      id: video.$id ?? null,
      title: video.title,
      url: video.url,
      description: video.description,
      thumbnail: video.thumbnail === youTubeThumbnail(video.youtubeId) ? '' : video.thumbnail,
      published: video.published,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-yanci-primary/60">
          Bidiyo {videos.length} — tsari daga sama zuwa kasa.
        </p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setDraft({ ...EMPTY_DRAFT });
          }}
          className="bg-yanci-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-yanci-paper transition-colors hover:bg-yanci-primary/90"
        >
          Ƙara bidiyo
        </button>
      </div>

      {error && (
        <div className="border border-yanci-red/30 bg-red-50 p-4 text-sm text-yanci-red">{error}</div>
      )}

      {videos.length === 0 && (
        <div className="border border-dashed border-yanci-primary/25 p-16 text-center">
          <p className="font-serif text-xl text-yanci-primary/50">Babu bidiyo a nan tukuna.</p>
          <p className="mt-1 text-sm text-yanci-primary/40">Danna "Ƙara bidiyo" don farawa.</p>
        </div>
      )}

      <ul className="space-y-4">
        {videos.map((video, index) => {
          const expanded = expandedId !== null && expandedId === video.$id;
          return (
            <li key={video.$id ?? index} className="border border-yanci-primary/15 bg-white/60 p-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : (video.$id ?? null))}
                  className="relative aspect-video w-full shrink-0 overflow-hidden bg-black sm:w-44"
                  title={expanded ? 'Rufe dubantawa' : 'Kalli dubantawa'}
                >
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      loading="lazy"
                      className="h-full w-full object-cover opacity-90 transition-opacity hover:opacity-100"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center font-bold text-white/40">
                      YT
                    </span>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-yanci-red/90 pl-0.5">
                      <svg viewBox="0 0 20 20" fill="white" className="h-4 w-4">
                        <path d="M6 4l10 6-10 6z" />
                      </svg>
                    </span>
                  </span>
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-yanci-primary/5 px-1.5 py-0.5 font-mono text-[10px] text-yanci-primary/50">
                      #{video.order}
                    </span>
                    {video.published ? (
                      <span className="bg-yanci-teal/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yanci-teal">
                        An buga
                      </span>
                    ) : (
                      <span className="bg-yanci-red/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yanci-red">
                        Ba a buga
                      </span>
                    )}
                    {video.youtubeId && (
                      <span className="text-[10px] font-mono text-yanci-primary/40">
                        {video.youtubeId}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1.5 line-clamp-2 font-serif text-lg font-bold leading-snug text-yanci-primary">
                    {video.title}
                  </h3>
                  {video.description && (
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-yanci-primary/60">
                      {video.description}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-start gap-2 sm:flex-col">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || busy}
                    className="border border-yanci-primary/25 px-2 py-1.5 text-xs font-medium text-yanci-primary transition-colors hover:bg-yanci-primary hover:text-yanci-paper disabled:cursor-not-allowed disabled:opacity-30"
                    title="Matsar sama"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M10 6l6 7H4z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === videos.length - 1 || busy}
                    className="border border-yanci-primary/25 px-2 py-1.5 text-xs font-medium text-yanci-primary transition-colors hover:bg-yanci-primary hover:text-yanci-paper disabled:cursor-not-allowed disabled:opacity-30"
                    title="Matsar kasa"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M10 14L4 7h12z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(video)}
                    className="border border-yanci-primary/25 px-3 py-1.5 text-xs font-bold text-yanci-primary transition-colors hover:bg-yanci-primary hover:text-yanci-paper"
                  >
                    Gyara
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => remove(video)}
                      disabled={busy}
                      className="border border-yanci-red/30 px-3 py-1.5 text-xs font-bold text-yanci-red transition-colors hover:bg-yanci-red hover:text-white disabled:opacity-50"
                    >
                      Goge
                    </button>
                  )}
                </div>
              </div>

              {expanded && video.youtubeId && (
                <div className="mt-4 aspect-video w-full overflow-hidden border border-yanci-primary/15 bg-black">
                  <iframe
                    src={youTubeEmbedUrl(video.youtubeId)}
                    title={video.title}
                    className="h-full w-full"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto border border-yanci-primary/15 bg-yanci-paper p-6 shadow-2xl">
            <h3 className="font-serif text-xl font-bold text-yanci-primary">
              {draft.id ? 'Gyara bidiyo' : 'Ƙara sabon bidiyo'}
            </h3>

            <label className="block">
              <span className={LABEL_CLASS}>Take</span>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className={INPUT_CLASS}
                placeholder="Misali: Tattaunawa kan zabe 2027"
              />
            </label>

            <label className="block">
              <span className={LABEL_CLASS}>Hanyar YouTube</span>
              <input
                type="text"
                value={draft.url}
                onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                className={INPUT_CLASS}
                placeholder="https://youtu.be/XXXXXXXXXXX"
              />
              <span className="mt-1 block text-xs text-yanci-primary/40">
                Yana karba: youtu.be, youtube.com/watch, /embed, /shorts, ko ID kai tsaye.
              </span>
            </label>

            {parsedId && (
              <div className="space-y-1.5">
                <span className={LABEL_CLASS}>Dubantawa</span>
                <div className="aspect-video w-full overflow-hidden border border-yanci-primary/15 bg-black">
                  <iframe
                    src={youTubeEmbedUrl(parsedId)}
                    title="Dubantawa"
                    className="h-full w-full"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              </div>
            )}
            {!parsedId && draft.url.trim() !== '' && (
              <p className="border border-yanci-red/30 bg-red-50 p-3 text-sm text-yanci-red">
                Ba a gane hanyar YouTube ba.
              </p>
            )}

            <label className="block">
              <span className={LABEL_CLASS}>Bayani</span>
              <textarea
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                className={`${INPUT_CLASS} resize-none`}
              />
            </label>

            <label className="block">
              <span className={LABEL_CLASS}>Hoton rufi (na zabi)</span>
              <input
                type="text"
                value={draft.thumbnail}
                onChange={(e) => setDraft({ ...draft, thumbnail: e.target.value })}
                className={INPUT_CLASS}
                placeholder="Boye komai don amfani da hoton YouTube"
              />
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
                className="size-4 accent-yanci-accent"
              />
              <span className="text-sm font-bold text-yanci-primary">An buga (a bayyane)</span>
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="px-4 py-2 text-sm font-bold text-yanci-primary/60 transition-colors hover:bg-yanci-primary/10"
              >
                Soke
              </button>
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="bg-yanci-primary px-8 py-2.5 text-sm font-bold uppercase tracking-wide text-yanci-paper transition-colors hover:bg-yanci-primary/90 disabled:opacity-50"
              >
                {busy ? 'Ana ajiye…' : 'Ajiye'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
