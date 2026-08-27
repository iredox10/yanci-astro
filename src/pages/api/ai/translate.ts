import type { APIRoute } from 'astro';
import {
  aiFailed,
  aiRateLimited,
  aiUnavailable,
  callGemini,
  clientIp,
  guardStaff,
  json,
  readAiJson,
} from '@lib/ai';

export const prerender = false;

interface TranslatePayload {
  text?: string;
  targetLang?: string;
  sourceLang?: string;
}

/**
 * POST /api/ai/translate
 * Translates between English and Hausa, keeping journalistic tone,
 * preserving formatting, quotes, HTML tags, and proper nouns.
 */
export const POST: APIRoute = async ({ request }) => {
  const denied = await guardStaff(request);
  if (denied) return denied;

  const ip = clientIp(request);
  if (aiRateLimited(ip)) {
    return json({ ok: false, message: 'A hankali — a sake gwadawa nan gaba' }, 429);
  }

  const parsed = await readAiJson<TranslatePayload>(request);
  if (!parsed.ok) return parsed.response;

  const { text: rawText, targetLang: rawTarget, sourceLang: rawSource } = parsed.data;

  if (typeof rawText !== 'string' || !rawText.trim()) {
    return json({ ok: false, message: 'Text is required' }, 422);
  }

  if (rawText.length > 32_000) {
    return json({ ok: false, message: 'Text too long' }, 413);
  }

  const targetLang = rawTarget?.trim().toLowerCase();
  if (targetLang !== 'ha' && targetLang !== 'en') {
    return json({ ok: false, message: 'Invalid target language (must be "ha" or "en")' }, 422);
  }

  const sourceLang = rawSource?.trim().toLowerCase();
  const targetLabel = targetLang === 'ha' ? 'Hausa' : 'English';
  const sourceLabel = sourceLang
    ? sourceLang === 'ha'
      ? 'Hausa'
      : 'English'
    : targetLang === 'ha'
      ? 'English'
      : 'Hausa';

  const systemInstruction = `You are a professional news translator and copy editor specializing in accurate ${sourceLabel}-to-${targetLabel} translation for news publication at yanci.ng.`;

  const prompt = [
    `Translate the following journalistic text from ${sourceLabel} to ${targetLabel}.`,
    '',
    'Requirements:',
    '- Maintain an accurate, objective journalistic tone and standard news style.',
    '- Preserve all HTML tags, quotes, proper names, and paragraph formatting exactly.',
    '- Return ONLY the translated text, without markdown code fences or explanatory commentary.',
    '',
    'Text to translate:',
    rawText.trim(),
  ].join('\n');

  const result = await callGemini(prompt, {
    temperature: 0.3,
    systemInstruction,
    maxTokens: 4096,
  });

  if (!result.ok) {
    if (result.error === 'not_configured') return aiUnavailable();
    console.error('[ai] translate failed:', result.error);
    return aiFailed('An kasa fassara rubutun');
  }

  let translation = result.text.trim();
  // Strip code block fences if accidentally included by the model
  if (translation.startsWith('```') && translation.endsWith('```')) {
    translation = translation.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  }

  if (!translation) return aiFailed('An kasa fassara rubutun');
  return json({ ok: true, translation });
};
