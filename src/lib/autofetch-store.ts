import { db } from '@db';
import { autofetchSources } from '@db/schema';
import { eq } from 'drizzle-orm';
import type { AutofetchSource } from './autofetch';

/**
 * Reads and updates the `autofetch_sources` table (server-only) that powers the sync
 * sidecar. Sources are never readable by anonymous clients.
 */

export async function listAutofetchSources(activeOnly = true): Promise<AutofetchSource[]> {
  if (!db) return [];
  try {
    const query = db.select().from(autofetchSources);
    if (activeOnly) {
      query.where(eq(autofetchSources.isActive, true));
    }
    const rows = await query;
    return rows.map((doc) => ({
      $id: doc.id,
      name: doc.name,
      url: doc.url,
      type: doc.type,
      isActive: doc.isActive,
      lastRun: doc.lastRun ? doc.lastRun.toISOString() : undefined,
    }));
  } catch (error) {
    console.error('[autofetch-store] list failed', error);
    return [];
  }
}

export async function touchSourceLastRun(id: string, at = new Date()): Promise<void> {
  if (!db) return;
  try {
    const date = typeof at === 'string' ? new Date(at) : at;
    await db
      .update(autofetchSources)
      .set({ lastRun: date })
      .where(eq(autofetchSources.id, id));
  } catch {
    /* non-fatal: annotation only */
  }
}

export const autofetchConfigured = () => db !== null;
