import type { APIRoute } from 'astro';
import {
  aiFailed,
  aiRateLimited,
  aiUnavailable,
  callGemini,
  clientIp,
  extractJsonArray,
  guardStaff,
  readAiText,
} from '@lib/ai';
import { sanitizePlainText } from '@lib/sanitize';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * POST /api/ai/tags — {text} -> up to 8 lowercase, deduped topic tags.
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
    'Extract up to 8 short topic tags from the article below.',
    'Reply with ONLY a JSON array of lowercase strings. No duplicates, no markdown.',
    '',
    'Article:',
    input.text,
  ].join('\n');

  const result = await callGemini(prompt, { temperature: 0.2, json: true });
  if (!result.ok) {
    if (result.error === 'not_configured') return aiUnavailable();
    console.error('[ai] tags failed:', result.error);
    return aiFailed('An kasa samun tags');
  }

  const seen = new Set<string>();
  for (const raw of extractJsonArray(result.text)) {
    const tag = sanitizePlainText(raw, 40).toLowerCase().replace(/\s+/g, '-');
    if (tag.length < 2 || seen.has(tag)) continue;
    seen.add(tag);
    if (seen.size >= 8) break;
  }

  if (seen.size === 0) return aiFailed('An kasa samun tags');
  return json({ ok: true, tags: [...seen] });
};
