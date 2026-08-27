export interface BookmarkArticleProps {
  id: string;
  headline: string;
  section?: string;
  pillar?: string;
  image?: string;
  slug?: string;
  publishDate?: string;
}

export interface SavedArticleItem extends BookmarkArticleProps {
  savedAt: string; // ISO 8601 string
}

export const BOOKMARKS_STORAGE_KEY = 'yanci_saved_articles';
export const BOOKMARKS_CHANGED_EVENT = 'yanci_bookmarks_changed';

/**
 * Retrieve all saved articles from localStorage (client-side only).
 */
export function getSavedArticles(): SavedArticleItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    console.error('Error reading bookmarks from localStorage', e);
    return [];
  }
}

/**
 * Check if a specific article ID is currently saved.
 */
export function isArticleSaved(id: string): boolean {
  if (!id || typeof window === 'undefined') return false;
  const articles = getSavedArticles();
  return articles.some((a) => String(a.id) === String(id));
}

/**
 * Save an article to localStorage.
 */
export function saveArticle(article: BookmarkArticleProps): SavedArticleItem[] {
  if (typeof window === 'undefined' || !article || !article.id) return [];
  try {
    const current = getSavedArticles();
    const idStr = String(article.id);
    const existingIndex = current.findIndex((a) => String(a.id) === idStr);

    const newItem: SavedArticleItem = {
      ...article,
      id: idStr,
      savedAt: new Date().toISOString(),
    };

    let updated: SavedArticleItem[];
    if (existingIndex >= 0) {
      updated = [newItem, ...current.filter((a) => String(a.id) !== idStr)];
    } else {
      updated = [newItem, ...current];
    }

    localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(updated));
    dispatchBookmarksChanged();
    return updated;
  } catch (e) {
    console.error('Error saving bookmark to localStorage', e);
    return getSavedArticles();
  }
}

/**
 * Remove an article from saved list by ID.
 */
export function removeSavedArticle(id: string): SavedArticleItem[] {
  if (typeof window === 'undefined' || !id) return [];
  try {
    const current = getSavedArticles();
    const updated = current.filter((a) => String(a.id) !== String(id));
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(updated));
    dispatchBookmarksChanged();
    return updated;
  } catch (e) {
    console.error('Error removing bookmark from localStorage', e);
    return getSavedArticles();
  }
}

/**
 * Toggle bookmark state for an article.
 */
export function toggleSavedArticle(article: BookmarkArticleProps): {
  saved: boolean;
  articles: SavedArticleItem[];
} {
  if (!article || !article.id) return { saved: false, articles: [] };
  if (isArticleSaved(article.id)) {
    const updated = removeSavedArticle(article.id);
    return { saved: false, articles: updated };
  } else {
    const updated = saveArticle(article);
    return { saved: true, articles: updated };
  }
}

/**
 * Clear all saved articles.
 */
export function clearAllSavedArticles(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(BOOKMARKS_STORAGE_KEY);
    dispatchBookmarksChanged();
  } catch (e) {
    console.error('Error clearing bookmarks from localStorage', e);
  }
}

/**
 * Dispatch custom event to notify all components on the same page.
 */
export function dispatchBookmarksChanged(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(BOOKMARKS_CHANGED_EVENT));
  } catch {
    // fallback
  }
}

/**
 * Subscribe to bookmark changes across tabs and within same page.
 */
export function subscribeBookmarks(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = () => callback();
  window.addEventListener(BOOKMARKS_CHANGED_EVENT, handler);
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener(BOOKMARKS_CHANGED_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
