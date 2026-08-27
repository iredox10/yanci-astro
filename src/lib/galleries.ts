import { SEED_GALLERIES, type GalleryEssay } from '../data/galleries';
import { loadArticle } from './content';
import type { GalleryItem } from '../components/PhotoGallery';

/**
 * Load all photo essay galleries.
 */
export async function loadGalleries(): Promise<GalleryEssay[]> {
  return SEED_GALLERIES;
}

/**
 * Load a single photo essay gallery by ID or slug.
 */
export async function loadGallery(selector: string): Promise<GalleryEssay | null> {
  const normalized = selector.trim().toLowerCase();
  
  // 1. Check seed galleries by exact or case-insensitive id or slug
  const directMatch = SEED_GALLERIES.find(
    (g) =>
      g.id.toLowerCase() === normalized ||
      g.slug.toLowerCase() === normalized ||
      String(g.id) === selector,
  );
  if (directMatch) return directMatch;

  // 2. Check if an article exists with this ID or slug
  try {
    const article = await loadArticle(selector);
    if (article) {
      const items: GalleryItem[] = [];
      if (article.image) {
        items.push({
          url: article.image,
          title: article.headline,
          caption: article.imageCaption || article.trail || article.headline,
          credit: article.imageCredit || article.author || 'Yanci',
        });
      }

      // Check if related articles have images to build a photo story
      if (items.length > 0) {
        return {
          id: String(article.$id ?? article.id ?? selector),
          slug: article.slug || selector,
          title: article.headline,
          kicker: article.kicker || 'Hotunan Labarai',
          description: article.trail || article.headline,
          lead: article.trail,
          pillar: article.pillar,
          section: article.section,
          photographer: article.author || 'Yanci',
          publishedAt: article.$createdAt || new Date().toISOString(),
          coverImage: article.image,
          items,
          tags: article.tags,
        };
      }
    }
  } catch {
    // Ignore article lookup errors
  }

  return null;
}
