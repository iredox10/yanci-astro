import type { APIRoute } from 'astro';
import {
  aiFailed,
  aiRateLimited,
  aiUnavailable,
  callGemini,
  clientIp,
  extractJsonObject,
  json,
  readAiJson,
} from '@lib/ai';
import { sanitizePlainText } from '@lib/sanitize';

export const prerender = false;

interface ExplainPayload {
  headline?: string;
  body?: string;
  text?: string;
}

interface ExplainModelResponse {
  summary?: string;
  bullets?: string[];
}

/**
 * POST /api/ai/explain
 * Generates a 3-4 bullet-point plain Hausa summary ("Ka fahimci labarin a takaice")
 * explaining context, key points, and impact.
 */
export const POST: APIRoute = async ({ request }) => {
  const ip = clientIp(request);
  if (aiRateLimited(ip)) {
    return json({ ok: false, message: 'A hankali — a sake gwadawa nan gaba' }, 429);
  }

  const parsed = await readAiJson<ExplainPayload>(request);
  if (!parsed.ok) return parsed.response;

  const { headline, body, text } = parsed.data;
  const rawBody = body ?? text;

  if (
    (!rawBody || typeof rawBody !== 'string' || !rawBody.trim()) &&
    (!headline || typeof headline !== 'string' || !headline.trim())
  ) {
    return json({ ok: false, message: 'Headline or article body is required' }, 422);
  }

  const cleanHeadline = headline ? sanitizePlainText(headline, 300) : '';
  const cleanBody = rawBody
    ? rawBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 6000)
    : '';

  const systemInstruction =
    'You are a senior Hausa journalism educator explaining complex news in clear, simple everyday Hausa for general readers under the rubric "Ka fahimci labarin a takaice".';

  const prompt = [
    'Explain this news article in simple, everyday Hausa.',
    '',
    `Headline: "${cleanHeadline || 'N/A'}"`,
    'Article body:',
    cleanBody || cleanHeadline,
    '',
    'Requirements:',
    '1. Provide a plain 1-2 sentence Hausa overview summary capturing the core story.',
    '2. Provide exactly 3 to 4 clear bullet points in Hausa explaining context, key facts, and why it matters/impact.',
    '',
    'Return ONLY a valid JSON object matching this schema:',
    '{',
    '  "summary": "plain Hausa summary text",',
    '  "bullets": [',
    '    "point 1",',
    '    "point 2",',
    '    "point 3"',
    '  ]',
    '}',
    'Do not include markdown code fences or explanatory commentary.',
  ].join('\n');

  const result = await callGemini(prompt, {
    temperature: 0.4,
    json: true,
    systemInstruction,
    maxTokens: 2048,
  });

  if (!result.ok) {
    if (result.error === 'not_configured') return aiUnavailable();
    console.error('[ai] explain failed:', result.error);
    return aiFailed('An kasa bayyana labarin');
  }

  const modelData = extractJsonObject<ExplainModelResponse>(result.text);
  if (!modelData) {
    return aiFailed('An kasa fassara bayanin labarin');
  }

  const summary = sanitizePlainText(modelData.summary ?? '', 1200);
  const bullets = (Array.isArray(modelData.bullets) ? modelData.bullets : [])
    .map((b) => sanitizePlainText(String(b), 400))
    .filter(Boolean)
    .slice(0, 4);

  if (!summary && bullets.length === 0) {
    return aiFailed('An kasa bayyana labarin');
  }

  return json({
    ok: true,
    bullets,
    summary,
    recap: summary,
  });
};
