import type { APIRoute } from 'astro';
import { requireUser, hasRole } from '@lib/auth';
import { runSource } from '@lib/autofetch';
import { adminCreateArticle, articleExistsByHeadline } from '@lib/admin-store';
import { autofetchConfigured, listAutofetchSources, touchSourceLastRun } from '@lib/autofetch-store';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * POST /api/autofetch/run
 *
 * Editorial-only; syncs configured RSS/homepage/article sources into DRAFTS.
 * Safe to schedule; runs the SSRF guard on every outbound URL and never
 * publishes anything (status stays 'draft' until an editor approves).
 */
export const POST: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'editor')) return json({ ok: false, message: 'Forbidden' }, 403);

  if (!autofetchConfigured()) {
    return json({ ok: false, message: 'Autofetch not configured (no autofetch_sources)' }, 503);
  }

  const sources = await listAutofetchSources(true);
  if (sources.length === 0) {
    return json({ ok: true, synced: 0, created: 0, skipped: ['No active sources'] });
  }

  const results = [];
  let created = 0;
  const skipped = [];

  for (const source of sources) {
    const run = await runSource(source);
    if (!run.ok) {
      skipped.push({ source: source.name, error: run.error });
      continue;
    }

    let persisted = 0;
    for (const draft of run.drafts) {
      if (await articleExistsByHeadline(draft.headline)) continue;

      const slug = draft.headline
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 150);

      const ok = await adminCreateArticle({
        headline: draft.headline,
        trail: draft.trail,
        body: draft.body,
        image: draft.image,
        author: 'AI Fetcher',
        status: 'draft',
        type: 'standard',
        section: draft.section || 'labarai',
        pillar: draft.pillar || 'news',
        isLive: false,
        review_status: 'pending',
        slug: slug || undefined,
        keyFigures: draft.source_url ? JSON.stringify({ source_url: draft.source_url }) : undefined,
      });
      if (ok) persisted++;
    }
    created += persisted;
    await touchSourceLastRun(source.$id ?? '');
    results.push({ source: source.name, ok: true, type: source.type, drafted: persisted });
  }

  return json({ ok: true, sources: results, created, skipped }, 200);
};