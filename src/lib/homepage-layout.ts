import { Client, Databases, ID, Query } from 'node-appwrite';
import { APPWRITE_API_KEY } from 'astro:env/server';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT_ID,
  PUBLIC_APPWRITE_DATABASE_ID,
  PUBLIC_APPWRITE_COLLECTION_HOMEPAGE_LAYOUT,
} from 'astro:env/client';

/**
 * Homepage module registry and persisted layout (`homepage_layout`
 * collection, one doc per module: { key, position, enabled }).
 */

export const HOMEPAGE_MODULES = [
  { key: 'breaking', label: 'Labaran gaggawa', blurb: 'Sakonnin kai tsaye a saman shafi.', live: true },
  { key: 'headlines', label: 'Manyan labarai', blurb: 'Babun labari da jerin sababbin rahotanni.', live: true },
  { key: 'opinion', label: "Ra'ayi", blurb: "Ra'ayoyin masana da sharhin edita.", live: true },
  { key: 'sport', label: 'Wasanni', blurb: 'Sakamako, gasa da labaran wasanni.', live: true },
  { key: 'culture', label: "Al'adu da Rayuwa", blurb: "Al'adu, fasaha da rayuwar yau da kullum.", live: true },
  { key: 'trending', label: 'Batutuwan da suka fi shahara', blurb: 'Abubuwan da masu karatu suka fi karantawa.', live: true },
  { key: 'stats', label: 'Kididdiga', blurb: 'Manyan lambobin jarida a band mai duhu.', live: true },
  { key: 'video', label: 'Bidiyo', blurb: 'Jerin labaran bidiyo na musamman.', live: false },
] as const;

export type HomepageModuleKey = (typeof HOMEPAGE_MODULES)[number]['key'];

export interface HomepageModuleDef {
  key: HomepageModuleKey;
  label: string;
  blurb: string;
  live: boolean;
}

export interface HomepageLayoutItem {
  key: HomepageModuleKey;
  position: number;
  enabled: boolean;
}

/** Raw doc as stored; `key` stays open since legacy rows may drift from the registry. */
export interface StoredHomepageLayoutDoc {
  $id: string;
  key: string;
  position: number;
  enabled: boolean;
}

const MODULE_MAP: Record<string, HomepageModuleDef> = {};
for (const mod of HOMEPAGE_MODULES) {
  MODULE_MAP[mod.key] = mod;
}

const DEFAULT_ENABLED: Record<HomepageModuleKey, boolean> = {
  breaking: true,
  headlines: true,
  opinion: true,
  sport: true,
  culture: true,
  trending: true,
  stats: true,
  video: false,
};

export const DEFAULT_HOMEPAGE_LAYOUT: HomepageLayoutItem[] = HOMEPAGE_MODULES.map((mod, i) => ({
  key: mod.key,
  position: i,
  enabled: DEFAULT_ENABLED[mod.key],
}));

export function isModuleKey(key: string): key is HomepageModuleKey {
  return Object.prototype.hasOwnProperty.call(MODULE_MAP, key);
}

export function moduleDef(key: string): HomepageModuleDef | null {
  return isModuleKey(key) ? MODULE_MAP[key] : null;
}

const READ_ANY = 'read("any")';

let _databases: Databases | null = null;

function store(): { databases: Databases; databaseId: string; collectionId: string } | null {
  const collectionId = PUBLIC_APPWRITE_COLLECTION_HOMEPAGE_LAYOUT || '';
  if (
    !APPWRITE_API_KEY ||
    !PUBLIC_APPWRITE_ENDPOINT ||
    !PUBLIC_APPWRITE_PROJECT_ID ||
    !PUBLIC_APPWRITE_DATABASE_ID ||
    !collectionId
  ) {
    return null;
  }
  if (!_databases) {
    _databases = new Databases(
      new Client()
        .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
        .setProject(PUBLIC_APPWRITE_PROJECT_ID)
        .setKey(APPWRITE_API_KEY),
    );
  }
  return { databases: _databases, databaseId: PUBLIC_APPWRITE_DATABASE_ID, collectionId };
}

function toDoc(raw: Record<string, unknown>): StoredHomepageLayoutDoc {
  return {
    $id: String(raw.$id),
    key: String(raw.key ?? ''),
    position: Number(raw.position ?? 0),
    enabled: Boolean(raw.enabled),
  };
}

function orderByPosition(items: HomepageLayoutItem[]): HomepageLayoutItem[] {
  return [...items]
    .sort((a, b) => a.position - b.position)
    .map((item, i) => ({ ...item, position: i }));
}

/** Full ordered layout: stored docs merged over registry defaults. */
export function normalizeLayout(
  items: { key: string; position: number; enabled: boolean }[],
): HomepageLayoutItem[] {
  const stored = new Map(
    items.filter((item) => isModuleKey(item.key)).map((item) => [item.key, item]),
  );
  return orderByPosition(
    HOMEPAGE_MODULES.map((mod, i) => {
      const found = stored.get(mod.key);
      if (!found) return { key: mod.key, position: i, enabled: DEFAULT_ENABLED[mod.key] };
      return { key: mod.key, position: found.position, enabled: found.enabled };
    }),
  );
}

export async function listHomepageLayoutDocs(): Promise<StoredHomepageLayoutDoc[]> {
  const s = store();
  if (!s) return [];
  try {
    const { documents } = await s.databases.listDocuments(s.databaseId, s.collectionId, [
      Query.orderAsc('position'),
      Query.limit(100),
    ]);
    return (documents ?? []).filter((d) => typeof d.key === 'string').map(toDoc);
  } catch (error) {
    console.error('[homepage-layout] list failed', error);
    return [];
  }
}

export async function getHomepageLayout(): Promise<HomepageLayoutItem[]> {
  return normalizeLayout(await listHomepageLayoutDocs());
}

/**
 * Full-replace save keyed by module key: creates missing docs, updates
 * existing ones and drops overrides that are no longer part of the set.
 */
export async function saveHomepageLayout(items: HomepageLayoutItem[]): Promise<boolean> {
  const cleaned = normalizeLayout(items);
  if (cleaned.length !== HOMEPAGE_MODULES.length) return false;
  const s = store();
  if (!s) return false;
  try {
    const existing = await listHomepageLayoutDocs();
    const byKey = new Map(existing.map((doc) => [doc.key, doc]));
    const kept = new Set<string>();
    for (const item of cleaned) {
      kept.add(item.key);
      const data = { position: item.position, enabled: item.enabled };
      const doc = byKey.get(item.key);
      if (doc) {
        await s.databases.updateDocument(s.databaseId, s.collectionId, doc.$id, data);
      } else {
        await s.databases.createDocument(
          s.databaseId,
          s.collectionId,
          ID.unique(),
          { key: item.key, ...data },
          [READ_ANY],
        );
      }
    }
    for (const doc of existing) {
      if (!kept.has(doc.key)) {
        await s.databases.deleteDocument(s.databaseId, s.collectionId, doc.$id);
      }
    }
    return true;
  } catch (error) {
    console.error('[homepage-layout] save failed', error);
    return false;
  }
}

export async function resetHomepageLayout(): Promise<boolean> {
  return saveHomepageLayout(DEFAULT_HOMEPAGE_LAYOUT);
}

export async function updateHomepageLayoutDoc(
  id: string,
  patch: { enabled?: boolean; position?: number },
): Promise<StoredHomepageLayoutDoc | null> {
  const s = store();
  if (!s || Object.keys(patch).length === 0) return null;
  try {
    const doc = await s.databases.updateDocument(s.databaseId, s.collectionId, id, patch);
    return toDoc(doc as unknown as Record<string, unknown>);
  } catch (error) {
    console.error('[homepage-layout] update failed', error);
    return null;
  }
}

export async function deleteHomepageLayoutDoc(id: string): Promise<boolean> {
  const s = store();
  if (!s) return false;
  try {
    await s.databases.deleteDocument(s.databaseId, s.collectionId, id);
    return true;
  } catch (error) {
    console.error('[homepage-layout] delete failed', error);
    return false;
  }
}

/** Strict body validation: every registry key exactly once, sane positions. */
export function parseLayoutItems(input: unknown): HomepageLayoutItem[] | null {
  if (!Array.isArray(input)) return null;
  const seen = new Set<string>();
  const items: Pick<HomepageLayoutItem, 'key' | 'position' | 'enabled'>[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') return null;
    const rec = raw as Record<string, unknown>;
    const key = typeof rec.key === 'string' ? rec.key : '';
    if (!isModuleKey(key) || seen.has(key)) return null;
    const position = Number(rec.position);
    if (!Number.isInteger(position) || position < 0 || position > 999) return null;
    seen.add(key);
    items.push({ key, position, enabled: Boolean(rec.enabled) });
  }
  if (items.length !== HOMEPAGE_MODULES.length) return null;
  return normalizeLayout(items);
}
