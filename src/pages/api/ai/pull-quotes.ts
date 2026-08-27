import type { APIRoute } from 'astro';
import {
  aiFailed,
  aiRateLimited,
  aiUnavailable,
  callGemini,
  clientIp,
  extractJsonArray,
  guardStaff,
  json,
  readAiJson,
} from '@lib/ai';
import { sanitizePlainText } from '@lib/sanitize';

export const prerender = false;

interface PullQuotesPayload {
  body?: string;
  text?: string;
}

/**
 * POST /api/ai/pull-quotes
 * Extracts 3-5 punchy, impactful pull-quotes from the article body.
 */
export const POST: APIRoute = async ({ request }) => {
  const denied = await guardStaff(request);
  if (denied) return denied;

  const ip = clientIp(request);
  if (aiRateLimited(ip)) {
    return json({ ok: false, message: 'A hankali — a sake gwadawa nan gaba' }, 429);
  }

  const parsed = await readAiJson<PullQuotesPayload>(request);
  if (!parsed.ok) return parsed.response;

  const rawBody = parsed.data.body ?? parsed.data.text;
  if (typeof rawBody !== 'string' || !rawBody.trim()) {
    return json({ ok: false, message: 'Article body is required' }, 422);
  }

  if (rawBody.length > 32_000) {
    return json({ ok: false, message: 'Text too long' }, 413);
  }

  const cleanBody = rawBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 8000);

  const systemInstruction =
    'You are a senior news layout editor selecting high-impact pull quotes for publication.';

  const prompt = [
    'Extract 3-5 punchy, memorable, and impactful pull-quotes from the article body below.',
    '',
    'Selection criteria:',
    '- Impactful and memorable statements or key facts.',
    '- Work well standalone without requiring surrounding context.',
    '- Suitable length for magazine/editorial callouts (under 180 characters each).',
    '- Preserve the original language of the text (Hausa or English).',
    '',
    'Return ONLY a JSON array of 3 to 5 quote strings. Example: ["Quote 1", "Quote 2", "Quote 3"]',
    'Do not include markdown code fences or explanatory commentary.',
    '',
    'Article body:',
    cleanBody,
  ].join('\n');

  const result = await callGemini(prompt, {
    temperature: 0.5,
    json: true,
    systemInstruction,
    maxTokens: 1024,
  });

  if (!result.ok) {
    if (result.error === 'not_configured') return aiUnavailable();
    console.error('[ai] pull-quotes failed:', result.error);
    return aiFailed('An kasa ciro maganganu masu muhimmanci');
  }

  let quotes: string[] = [];
  try {
    const stripped = result.text.replace(/```(?:json)?/gi, '').trim();
    const parsedJson: unknown = JSON.parse(stripped);
    if (Array.isArray(parsedJson)) {
      quotes = parsedJson
        .map((item) => {
          if (typeof item === 'string') return sanitizePlainText(item, 300);
          if (typeof item === 'object' && item !== null && 'quote' in item) {
            return sanitizePlainText(String((item as { quote: unknown }).quote), 300);
          }
          return '';
        })
        .filter(Boolean);
    }
  } catch {
    quotes = extractJsonArray(result.text)
      .map((q) => sanitizePlainText(q, 300))
      .filter(Boolean);
  }

  quotes = quotes.slice(0, 5);

  if (quotes.length === 0) {
    return aiFailed('An kasa ciro maganganu masu muhimmanci');
  }

  return json({ ok: true, quotes });
};
