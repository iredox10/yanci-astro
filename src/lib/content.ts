import {
  isAppwriteConfigured,
  getArticles,
  getArticleById,
  getArticleBySlug,
  getMostRead,
} from './appwrite-server';
import { SEED_ARTICLES } from '../data/seed';
import type { Article, ArticleCard } from '../data/schema';

/**
 * Read-through content layer. When Appwrite is configured (server only) it
 * queries the `articles` collection; otherwise it falls back to the bundled
 * seed so the site still runs in dev / unconfigured previews.
 */

export const canReadLive = isAppwriteConfigured();

export async function loadArticles(): Promise<Article[]> {
  if (!canReadLive) return SEED_ARTICLES as unknown as Article[];
  const live = await getArticles(200);
  return live.length > 0 ? live : (SEED_ARTICLES as unknown as Article[]);
}

export async function loadArticle(selector: string): Promise<Article | null> {
  if (canReadLive) {
    const bySlug = await getArticleBySlug(selector);
    if (bySlug) return bySlug;
    const byId = await getArticleById(selector);
    if (byId) return byId;
    return null;
  }
  return (
    SEED_ARTICLES.find(
      (a) => String(a.id) === selector || (a as { slug?: string }).slug === selector,
    ) ?? null
  ) as unknown as Article | null;
}

export async function loadSectionFeed(sectionKey: string): Promise<Article[]> {
  const all = await loadArticles();
  const matches = all.filter((a) => {
    const s = String(a.section ?? '').toLowerCase();
    return s === sectionKey || s === sectionKey.split('-')[0];
  });
  if (matches.length > 0) return matches;
  if (!canReadLive) return all;
  return all;
}

export async function loadSearchResults(query: string): Promise<Article[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all = await loadArticles();
  return all.filter(
    (a) =>
      a.headline?.toLowerCase().includes(q) ||
      a.trail?.toLowerCase().includes(q) ||
      (Array.isArray(a.tags) && a.tags.some((t) => t.toLowerCase().includes(q))) ||
      a.author?.toLowerCase().includes(q),
  );
}

export async function loadAuthorFeed(author: string): Promise<Article[]> {
  const all = await loadArticles();
  return all.filter((a) => a.author?.toLowerCase() === author.toLowerCase());
}

/** Article cards; seed views remain until the views collection reports in. */
export async function toCards(articles: Article[]): Promise<ArticleCard[]> {
  return articles.map(toCard);
}

export function toCard(article: Article): ArticleCard {
  return {
    id: article.id ?? article.$id,
    $id: article.$id,
    headline: article.headline,
    kicker: article.kicker,
    trail: article.trail,
    image: article.image,
    pillar: article.pillar,
    type: article.type,
    section: article.section,
    author: article.author,
    $createdAt: article.$createdAt,
    isLive: article.isLive,
  };
}

/** Merge real view counts into cards (needs the views collection enabled). */
export function applyViewCount(card: ArticleCard, most: Awaited<ReturnType<typeof getMostRead>>): ArticleCard {
  const key = String(card.id ?? card.$id ?? '');
  const hit = most.find((m) => m.articleId === key);
  return hit ? { ...card, views: hit.views } : card;
}