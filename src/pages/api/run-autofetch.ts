import type { APIRoute } from 'astro';
import { requireUser, hasRole } from '@lib/auth';
import { runSource } from '@lib/autofetch';
import { adminCreateArticle, articleExistsByHeadline, getLastAdminStoreError } from '@lib/admin-store';
import { autofetchConfigured, listAutofetchSources, touchSourceLastRun } from '@lib/autofetch-store';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return new Response('Unauthorized\n', { status: auth.status });
  if (!hasRole(auth.user, 'editor')) return new Response('Forbidden\n', { status: 403 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const log = (msg: string) => controller.enqueue(encoder.encode(msg + '\n'));

      try {
        log('🔍 Initializing Auto Fetcher sidecar...');

        if (!autofetchConfigured()) {
          log('⚠️ Autofetch collection not configured in Appwrite. Checking fallback sources...');
        }

        const sources = await listAutofetchSources(true);
        if (sources.length === 0) {
          log('ℹ️ No active sources found. Configure or activate sources to fetch articles.');
          controller.close();
          return;
        }

        log(`📡 Found ${sources.length} active source(s) to scan.\n`);
        let totalCreated = 0;

        for (const source of sources) {
          log(`⏳ Fetching [${source.type?.toUpperCase() ?? 'RSS'}] ${source.name} (${source.url})...`);
          const run = await runSource(source);
          if (!run.ok) {
            log(`   ❌ Error: ${run.error ?? 'Unknown error'}\n`);
            continue;
          }

          log(`   Found ${run.drafts.length} item(s). Processing drafts...`);
          let persisted = 0;

          for (const draft of run.drafts) {
            if (await articleExistsByHeadline(draft.headline)) {
              log(`   ⏭️ Skipped duplicate: "${draft.headline.slice(0, 50)}..."`);
              continue;
            }

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

            if (ok) {
              persisted++;
              log(`   ✅ Saved Draft: "${draft.headline.slice(0, 50)}..."`);
            } else {
              const err = getLastAdminStoreError();
              log(`   ⚠️ Failed to save draft: "${draft.headline.slice(0, 50)}..." (${err ?? 'Unknown error'})`);
            }
          }

          totalCreated += persisted;
          await touchSourceLastRun(source.$id ?? '');
          log(`   🏁 Source completed: ${persisted} new draft(s) created.\n`);
        }

        log(`✨ Auto-fetch complete! Total new draft articles created: ${totalCreated}`);
      } catch (err: any) {
        log(`💥 Fatal error during auto-fetch: ${err?.message ?? err}`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  });
};
