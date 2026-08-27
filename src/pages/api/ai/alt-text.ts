import type { APIRoute } from 'astro';
import {
  aiFailed,
  aiRateLimited,
  aiUnavailable,
  callGemini,
  clientIp,
  extractJsonObject,
  guardStaff,
  json,
  readAiJson,
} from '@lib/ai';
import { sanitizePlainText } from '@lib/sanitize';

export const prerender = false;

interface AltTextPayload {
  headline?: string;
  body?: string;
  caption?: string;
  imageUrl?: string;
}

interface AltTextModelResponse {
  altTextHa?: string;
  altTextEn?: string;
  caption?: string;
}

/**
 * POST /api/ai/alt-text
 * Generates accessible alt-text (Hausa and English) and a journalistic image caption.
 */
export const POST: APIRoute = async ({ request }) => {
  const denied = await guardStaff(request);
  if (denied) return denied;

  const ip = clientIp(request);
  if (aiRateLimited(ip)) {
    return json({ ok: false, message: 'A hankali — a sake gwadawa nan gaba' }, 429);
  }

  const parsed = await readAiJson<AltTextPayload>(request);
  if (!parsed.ok) return parsed.response;

  const { headline, body, caption, imageUrl } = parsed.data;

  const hasContext = Boolean(
    (typeof headline === 'string' && headline.trim()) ||
      (typeof body === 'string' && body.trim()) ||
      (typeof caption === 'string' && caption.trim()) ||
      (typeof imageUrl === 'string' && imageUrl.trim()),
  );

  if (!hasContext) {
    return json(
      { ok: false, message: 'At least one of headline, body, caption, or imageUrl is required' },
      422,
    );
  }

  const cleanHeadline = headline ? sanitizePlainText(headline, 300) : '';
  const cleanCaption = caption ? sanitizePlainText(caption, 300) : '';
  const cleanBody = body
    ? body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000)
    : '';

  const systemInstruction =
    'You are a digital accessibility specialist and photo editor for a Nigerian news publication (Yanci).';

  const prompt = [
    'Generate accessible alt-text (in Hausa and English) and a concise journalistic photo caption based on the context below.',
    '',
    `Headline: ${cleanHeadline || 'Not provided'}`,
    `Current Caption/Notes: ${cleanCaption || 'Not provided'}`,
    `Image URL: ${imageUrl || 'Not provided'}`,
    `Article Context: ${cleanBody || 'Not provided'}`,
    '',
    'Requirements:',
    '- altTextHa: Accessible image description in Hausa for screen readers (under 125 chars, factual, objective description of what the image likely shows in relation to the news story).',
    '- altTextEn: Accessible image description in English for screen readers (under 125 chars, factual, objective description).',
    '- caption: A professional journalistic image caption in Hausa (1 sentence, under 120 chars, present tense, context-rich).',
    '',
    'Return ONLY a valid JSON object matching this schema:',
    '{',
    '  "altTextHa": "...",',
    '  "altTextEn": "...",',
    '  "caption": "..."',
    '}',
    'Do not include markdown code fences or explanatory commentary.',
  ].join('\n');

  const result = await callGemini(prompt, {
    temperature: 0.4,
    json: true,
    systemInstruction,
    maxTokens: 512,
  });

  if (!result.ok) {
    if (result.error === 'not_configured') return aiUnavailable();
    console.error('[ai] alt-text failed:', result.error);
    return aiFailed('An kasa samar da bayanin hoto');
  }

  const modelData = extractJsonObject<AltTextModelResponse>(result.text);
  if (!modelData) {
    return aiFailed('An kasa fassara sakamakon bayanin hoto');
  }

  const altTextHa = sanitizePlainText(modelData.altTextHa ?? '', 300);
  const altTextEn = sanitizePlainText(modelData.altTextEn ?? '', 300);
  const finalCaption = sanitizePlainText(modelData.caption ?? '', 300);

  if (!altTextHa && !altTextEn && !finalCaption) {
    return aiFailed('An kasa samar da bayanin hoto');
  }

  return json({
    ok: true,
    altTextHa,
    altTextEn,
    caption: finalCaption,
  });
};
