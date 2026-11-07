import { eq, desc } from 'drizzle-orm';
import {
  db,
  highlights,
  homepageStats,
  sportsData,
  settings,
  elections,
  candidates,
  electionResults,
  factChecks,
  articleViews,
  autofetchSources,
  invitations,
  newsletterSubscribers,
  roles,
  users,
} from '../db';

export const READ_ANY = 'read("any")';

export type CollectionKey =
  | 'highlights'
  | 'stats'
  | 'sports'
  | 'settings'
  | 'elections'
  | 'candidates'
  | 'results'
  | 'factchecks'
  | 'views'
  | 'autofetch'
  | 'invitations'
  | 'newsletter'
  | 'roles'
  | 'staff';

function getTableForKey(key: CollectionKey): any {
  switch (key) {
    case 'highlights': return highlights;
    case 'stats': return homepageStats;
    case 'sports': return sportsData;
    case 'settings': return settings;
    case 'elections': return elections;
    case 'candidates': return candidates;
    case 'results': return electionResults;
    case 'factchecks': return factChecks;
    case 'views': return articleViews;
    case 'autofetch': return autofetchSources;
    case 'invitations': return invitations;
    case 'newsletter': return newsletterSubscribers;
    case 'roles': return roles;
    case 'staff': return users;
    default: return null;
  }
}

export async function adminListCollection<T = Record<string, unknown>>(
  key: CollectionKey,
  limit = 500,
): Promise<T[]> {
  const table = getTableForKey(key);
  if (!table) return [];
  try {
    const rows = await db.select().from(table).limit(limit);
    return rows.map((r: any) => ({
      ...r,
      $id: r.id ?? r.key,
      id: r.id ?? r.key,
    })) as T[];
  } catch (error) {
    console.error(`[admin-collections] list ${key} failed`, error);
    return [];
  }
}

export async function adminCreateCollectionDoc(
  key: CollectionKey,
  data: Record<string, unknown>,
): Promise<string | null> {
  const table = getTableForKey(key);
  if (!table) return null;
  try {
    const id = String(data.id || data.$id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    const payload: any = { ...data, id };
    delete payload.$id;

    await db.insert(table).values(payload);
    return id;
  } catch (error) {
    console.error(`[admin-collections] create ${key} failed`, error);
    return null;
  }
}

export async function adminUpdateCollectionDoc(
  key: CollectionKey,
  id: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  const table = getTableForKey(key);
  if (!table) return false;
  try {
    const payload: any = { ...data };
    delete payload.$id;
    delete payload.id;

    const idCol = key === 'settings' ? table.key : table.id;
    await db.update(table).set(payload).where(eq(idCol, id));
    return true;
  } catch (error) {
    console.error(`[admin-collections] update ${key} failed`, error);
    return false;
  }
}

export async function adminDeleteCollectionDoc(
  key: CollectionKey,
  id: string,
): Promise<boolean> {
  const table = getTableForKey(key);
  if (!table) return false;
  try {
    const idCol = key === 'settings' ? table.key : table.id;
    await db.delete(table).where(eq(idCol, id));
    return true;
  } catch (error) {
    console.error(`[admin-collections] delete ${key} failed`, error);
    return false;
  }
}
