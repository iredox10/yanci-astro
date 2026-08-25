import type { APIRoute } from 'astro';
import {
  aiFailed,
  aiRateLimited,
  aiUnavailable,
  callGemini,
  clientIp,
  guardStaff,
  readAiText,
} from '@lib/ai';
import { sanitizePlainText } from '@lib/sanitize';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * POST /api/ai/summarize — {text} -> 2-sentence summary.
 */
export const POST: APIRoute = async ({ request }) => {
  const denied = await guardStaff(request);
  if (denied) return denied;

  const ip = clientIp(request);
  if (aiRateLimited(ip)) {
    return json({ ok: false, message: 'A hankali — a sake gwadawa nan gaba' }, 429);
  }

  const input = await readAiText(request);
  if (!input.ok) return input.response;

  const prompt = [
    'Summarize the article below in exactly 2 clear sentences,',
    'in the same language as the article. Reply with only the summary text.',
    '',
    'Article:',
    input.text,
  ].join('\n');

  const result = await callGemini(prompt, { temperature: 0.4 });
  if (!result.ok) {
    if (result.error === 'not_configured') return aiUnavailable();
    console.error('[ai] summarize failed:', result.error);
    return aiFailed('An kasa samun taƙaitaccen bayani');
  }

  const summary = sanitizePlainText(result.text, 1200);
  if (!summary) return aiFailed('An kasa samun taƙaitaccen bayani');
  return json({ ok: true, summary });
};
