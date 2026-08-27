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

interface GrammarPayload {
  text?: string;
  lang?: string;
}

interface GrammarSuggestion {
  original: string;
  suggestion: string;
  reason: string;
}

interface GrammarModelResponse {
  suggestions?: GrammarSuggestion[];
  correctedText?: string;
}

/**
 * POST /api/ai/grammar
 * Checks Hausa/English grammar, spelling, stylistic clarity, and journalistic standards.
 */
export const POST: APIRoute = async ({ request }) => {
  const denied = await guardStaff(request);
  if (denied) return denied;

  const ip = clientIp(request);
  if (aiRateLimited(ip)) {
    return json({ ok: false, message: 'A hankali — a sake gwadawa nan gaba' }, 429);
  }

  const parsed = await readAiJson<GrammarPayload>(request);
  if (!parsed.ok) return parsed.response;

  const { text: rawText, lang: rawLang } = parsed.data;

  if (typeof rawText !== 'string' || !rawText.trim()) {
    return json({ ok: false, message: 'Text is required' }, 422);
  }

  if (rawText.length > 32_000) {
    return json({ ok: false, message: 'Text too long' }, 413);
  }

  const lang = rawLang?.trim().toLowerCase() === 'en' ? 'en' : 'ha';
  const languageLabel = lang === 'en' ? 'English' : 'Hausa';

  const systemInstruction = `You are a professional copy editor and proofreader specializing in ${languageLabel} news editing, journalistic clarity, and grammar correction.`;

  const prompt = [
    `Review this article text in ${languageLabel} for grammar, spelling, stylistic clarity, tone consistency, and journalistic standards.`,
    '',
    'Article text:',
    rawText.trim(),
    '',
    'Return ONLY a valid JSON object matching this schema:',
    '{',
    '  "suggestions": [',
    '    {',
    '      "original": "exact original snippet with issue",',
    '      "suggestion": "corrected replacement",',
    '      "reason": "concise explanation of the grammar or style issue"',
    '    }',
    '  ],',
    '  "correctedText": "the full corrected text with all improvements applied"',
    '}',
    '',
    'If no issues are found, return "suggestions": [] and "correctedText" equal to the input text.',
    'Do not include markdown code fences or any other text.',
  ].join('\n');

  const result = await callGemini(prompt, {
    temperature: 0.2,
    json: true,
    systemInstruction,
    maxTokens: 4096,
  });

  if (!result.ok) {
    if (result.error === 'not_configured') return aiUnavailable();
    console.error('[ai] grammar failed:', result.error);
    return aiFailed('An kasa duba nahawu');
  }

  const modelData = extractJsonObject<GrammarModelResponse>(result.text);
  if (!modelData) {
    return aiFailed('An kasa fassara sakamakon AI');
  }

  const suggestions: GrammarSuggestion[] = (modelData.suggestions ?? [])
    .map((item) => ({
      original: sanitizePlainText(String(item.original ?? ''), 500),
      suggestion: sanitizePlainText(String(item.suggestion ?? ''), 500),
      reason: sanitizePlainText(String(item.reason ?? ''), 500),
    }))
    .filter((item) => item.original && item.suggestion);

  const correctedText =
    typeof modelData.correctedText === 'string' && modelData.correctedText.trim()
      ? modelData.correctedText.trim()
      : rawText.trim();

  return json({
    ok: true,
    suggestions,
    correctedText,
  });
};
