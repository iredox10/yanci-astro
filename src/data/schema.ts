/**
 * Yanci content model.
 *
 * Mirrors the Appwrite `articles` collection AFTER the keyFigures unpacking
 * (see src/server/appwrite.ts). These fields came from the legacy app; new
 * optional fields are additive so old rows keep rendering.
 */

export type Pillar = 'news' | 'sport' | 'opinion' | 'culture' | 'lifestyle';

export interface Article {
  $id?: string;
  id?: string | number;
  headline: string;
  kicker?: string;
  trail?: string;
  body?: string;
  image?: string;
  videoUrl?: string;
  keyFigures?: string;
  pillar: Pillar | string;
  section?: string;
  type?: 'hero' | 'standard' | 'compact' | string;
  author?: string;
  isLive?: boolean;
  liveUpdates?: LiveUpdate[];
  series?: string;
  status?: 'draft' | 'published' | 'scheduled';
  publishAt?: string;
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  isSensitive?: boolean;
  imageFocalX?: number;
  imageFocalY?: number;
  format?: string;

  is_breaking?: boolean;
  breaking_until?: string;
  review_status?: 'pending' | 'approved' | 'rejected';
  focal_point?: { x: number; y: number } | string;
  saved_count?: number;
  source_url?: string;

  // Unpacked from keyFigures JSON (overflow bag) in the legacy app
  imageCaption?: string;
  imageCredit?: string;
  imageAlt?: string;
  tags?: string[];
  coAuthor?: string;
  ogTitle?: string;
  ogDescription?: string;
  relatedArticles?: string[];

  $createdAt?: string;
  $updatedAt?: string;
  views?: number;
}

export interface LiveUpdate {
  id?: string | number;
  timestamp?: string;
  time?: string;
  title?: string;
  content?: string;
  type?: 'key-event' | 'update' | 'repo';
  pinned?: boolean;
  author?: string;
  image?: string;
}

/** Reader comment on an article. */
export interface Comment {
  $id?: string;
  articleId: string;
  name: string;
  body: string;
  likes: number;
  ownerToken?: string;
  status?: 'pending' | 'approved' | 'rejected';
  $createdAt?: string;
}

/** Reader poll option and poll model. */
export interface PollOption {
  id: string;
  text: string;
  votes: number;
  percentage?: number;
}

export interface Poll {
  $id?: string;
  id: string;
  question: string;
  description?: string;
  category?: string;
  options: PollOption[];
  totalVotes: number;
  active?: boolean;
  createdAt?: string;
}

/** Article card data passed to NewsCard/etc. */
export type ArticleCard = Pick<
  Article,
  'id' | '$id' | 'headline' | 'kicker' | 'trail' | 'image' | 'pillar' | 'type' | 'section' | 'author' | '$createdAt' | 'isLive'
> & { views?: number };

export interface PillarColors {
  main: string;
  pastel: string;
  dark: string;
  bg?: string;
}

export const PILLARS: Record<string, PillarColors> = {
  news: { main: '#8a2c2c', pastel: '#eecaca', dark: '#631a1a' },
  sport: { main: '#2c7a7b', pastel: '#b2f5ea', dark: '#1a4e4f' },
  opinion: { main: '#c59d5f', pastel: '#fdf3d8', dark: '#8a6a35', bg: '#fbf8f3' },
  culture: { main: '#553c9a', pastel: '#e9d8fd', dark: '#322659' },
  lifestyle: { main: '#d69e2e', pastel: '#fefcbf', dark: '#975a16' },
};

export const pillarColors = (pillar?: string): PillarColors => PILLARS[pillar ?? ''] ?? PILLARS.news;

/** Article page accent per legacy Guardian reader (distinct from card colors). */
export const pillarAccent = (pillar?: string): string => {
  if (pillar === 'sport') return '#0084c6';
  if (pillar === 'culture') return '#a1845c';
  if (pillar === 'lifestyle') return '#bb3b80';
  if (pillar === 'opinion') return '#e05e00';
  return '#c70000';
};

export const SECTION_ROUTES = [
  { label: 'Labarai', path: '/labarai' },
  { label: 'Siyasa', path: '/siyasa' },
  { label: 'Kasuwanci', path: '/kasuwanci' },
  { label: 'Wasanni', path: '/wasanni' },
  { label: 'Fasaha', path: '/fasaha' },
  { label: "Ra'ayi", path: '/raayi' },
  { label: "Al'adu", path: '/aladu' },
  { label: 'Bidiyo', path: '/bidiyo' },
  { label: 'Zabe', path: '/zabe' },
] as const;

export const TICKER: string[] = [
  'Farashin danyen mai ya fadi da kashi uku saboda karin samarwa a Afirka',
  "Jami'ar Kano ta kaddamar da tsarin karatun AI na farko a Arewa",
  'Masu sana’ar noma sun samu tallafin ruwan sama na zamani daga gwamnati',
  'Matasa 5,000 sun kammala horon fasahar sadarwa a cibiyar Yanci Lab',
];