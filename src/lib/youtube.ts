const YOUTUBE_PATTERNS = [
  /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /(?:www\.|m\.)?youtube(?:-nocookie)?\.com\/watch\?(?:[^#]*&)?v=([a-zA-Z0-9_-]{11})/,
  /(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  /(?:www\.)?youtube(?:-nocookie)?\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  /(?:www\.)?youtube(?:-nocookie)?\.com\/live\/([a-zA-Z0-9_-]{11})/,
  /(?:www\.)?youtube(?:-nocookie)?\.com\/v\/([a-zA-Z0-9_-]{11})/,
];

export function parseYouTubeId(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = input.trim();
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = raw.match(pattern);
    if (match?.[1]) return match[1];
  }
  return /^[a-zA-Z0-9_-]{11}$/.test(raw) ? raw : null;
}

export function youTubeThumbnail(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

export function youTubeEmbedUrl(youtubeId: string): string {
  return `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1`;
}
