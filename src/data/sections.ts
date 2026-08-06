import type { Pillar } from './schema';

export interface SectionDef {
  slug: string;
  label: string;
  pillar: Pillar;
  blurb: string;
}

export const SECTIONS: SectionDef[] = [
  { slug: 'labarai', label: 'Labarai', pillar: 'news', blurb: 'Labari daga Najeriya, Afirka da Duniya.' },
  { slug: 'siyasa', label: 'Siyasa', pillar: 'news', blurb: 'Siyasar Najeriya da duniya.' },
  { slug: 'kasuwanci', label: 'Kasuwanci', pillar: 'lifestyle', blurb: 'Kasuwa, hannayen jari da tattalin arziki.' },
  { slug: 'wasanni', label: 'Wasanni', pillar: 'sport', blurb: 'Kwallon kafa, wasanni da sakamako.' },
  { slug: 'fasaha', label: 'Fasaha', pillar: 'lifestyle', blurb: 'Fasaha, mafasta da kirkire-kirkire.' },
  { slug: 'raayi', label: "Ra'ayi", pillar: 'opinion', blurb: "Ra'ayoyin masana da sharhin edita." },
  { slug: 'aladu', label: "Al'adu", pillar: 'culture', blurb: "Fasaha, fina-finai, kiɗa da al'adunmu." },
  { slug: 'bidiyo', label: 'Bidiyo', pillar: 'culture', blurb: 'Labarun bidiyo kai tsaye.' },
  { slug: 'zabe', label: 'Zabe', pillar: 'news', blurb: "Zabe, 'yan takara da bayanan zabe." },
];

const SLUG_TO_SECTION: Record<string, string> = {
  labarai: 'headlines',
  siyasa: 'siyasa',
  kasuwanci: 'kasuwanci',
  wasanni: 'sport',
  fasaha: 'fasaha',
  raayi: 'opinion',
  aladu: 'culture',
  bidiyo: 'bidiyo',
  zabe: 'zabe',
};

export const sectionBySlug = (slug?: string) =>
  SECTIONS.find((s) => s.slug === slug);

/** Warehouse section name used in the `articles` collection, if any. */
export const sectionKeyForSlug = (slug?: string): string | undefined =>
  slug ? SLUG_TO_SECTION[slug] : undefined;

export const pillarForSlug = (slug?: string): Pillar =>
  sectionBySlug(slug)?.pillar ?? 'news';