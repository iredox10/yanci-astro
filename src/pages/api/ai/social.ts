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

interface SocialPayload {
  headline?: string;
  text?: string;
  body?: string;
  trail?: string;
  tags?: string[] | string;
  url?: string;
}

interface SocialModelResponse {
  twitter?: string;
  facebook?: string;
}

/**
 * POST /api/ai/social
 * Generates formatted Twitter/X post (with hashtags) and Facebook post formatted for Yanci.
 */
export const POST: APIRoute = async ({ request }) => {
  const denied = await guardStaff(request);
  if (denied) return denied;

  const ip = clientIp(request);
  if (aiRateLimited(ip)) {
    return json({ ok: false, message: 'A hankali — a sake gwadawa nan gaba' }, 429);
  }

  const parsed = await readAiJson<SocialPayload>(request);
  if (!parsed.ok) return parsed.response;

  const { headline, text, body, trail, tags, url } = parsed.data;
  const rawContent = headline || text || body || trail;

  if (!rawContent || typeof rawContent !== 'string' || !rawContent.trim()) {
    return json({ ok: false, message: 'Headline or text is required' }, 422);
  }

  const cleanHeadline = headline ? sanitizePlainText(headline, 300) : sanitizePlainText(rawContent, 300);
  const cleanTrail = trail ? sanitizePlainText(trail, 500) : (text && text !== headline ? sanitizePlainText(text, 500) : '');
  const cleanUrl = url ? sanitizePlainText(url, 200) : '';

  let tagsList = '';
  if (Array.isArray(tags)) {
    tagsList = tags
      .map((t) => sanitizePlainText(String(t), 50))
      .filter(Boolean)
      .join(', ');
  } else if (typeof tags === 'string' && tags.trim()) {
    tagsList = sanitizePlainText(tags, 200);
  }

  const systemInstruction =
    'You are a senior social media manager for Yanci (yanci.ng), writing compelling, accurate, and viral Hausa social media posts.';

  const prompt = [
    'Generate formatted social media posts in Hausa for Twitter/X and Facebook based on this news article.',
    '',
    `Headline: "${cleanHeadline}"`,
    `Summary / Trail: "${cleanTrail || 'N/A'}"`,
    `Tags / Topics: "${tagsList || 'N/A'}"`,
    `Article Link: "${cleanUrl || 'https://yanci.ng'}"`,
    '',
    'Rules:',
    '- twitter: Maximum 280 characters. Catchy Hausa hook, 2-3 relevant hashtags (e.g. #Yanci #Labarai #Najeriya), and include the article URL.',
    '- facebook: Engaging Hausa post (200-500 characters). Conversational journalistic tone, key details, 2-3 hashtags, and include the article URL.',
    '',
    'Return ONLY a valid JSON object matching this schema:',
    '{',
    '  "twitter": "...",',
    '  "facebook": "..."',
    '}',
    'Do not include markdown code fences or explanatory commentary.',
  ].join('\n');

  const result = await callGemini(prompt, {
    temperature: 0.6,
    json: true,
    systemInstruction,
    maxTokens: 1024,
  });

  if (!result.ok) {
    if (result.error === 'not_configured') return aiUnavailable();
    console.error('[ai] social failed:', result.error);
    return aiFailed('An kasa samar da saƙonnin sada zumunta');
  }

  const modelData = extractJsonObject<SocialModelResponse>(result.text);
  if (!modelData) {
    return aiFailed('An kasa fassara sakamakon saƙonnin sada zumunta');
  }

  const twitter = sanitizePlainText(modelData.twitter ?? '', 400);
  const facebook = sanitizePlainText(modelData.facebook ?? '', 1000);

  if (!twitter && !facebook) {
    return aiFailed('An kasa samar da saƙonnin sada zumunta');
  }

  return json({
    ok: true,
    twitter,
    facebook,
    posts: {
      twitter,
      x: twitter,
      facebook,
    },
  });
};
