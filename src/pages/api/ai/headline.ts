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
 * POST /api/ai/headline — {text} -> 3 Hausa headline suggestions.
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
    'You are a Hausa news editor at yanci.ng.',
    'Write exactly 3 short, accurate news headlines in Hausa for the article below.',
    'Reply with ONLY a JSON array of 3 strings. No markdown, no commentary.',
    '',
    'Article:',
    input.text,
  ].join('\n');

  const result = await callGemini(prompt, { temperature: 0.7, json: true });
  if (!result.ok) {
    if (result.error === 'not_configured') return aiUnavailable();
    console.error('[ai] headline failed:', result.error);
    return aiFailed('An kasa samun kanun labarai');
  }

  const headlines = extractJsonArray(result.text)
    .map((h) => sanitizePlainText(h, 200))
    .filter(Boolean)
    .slice(0, 3);

  if (headlines.length === 0) return aiFailed('An kasa samun kanun labarai');
  return json({ ok: true, headlines });
};
