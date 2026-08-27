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

export interface HeadlineItem {
  style: string;
  headline: string;
}

/**
 * POST /api/ai/headline — {text} -> 8 distinct Hausa headline styles.
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
    'You are an expert bilingual news editor at yanci.ng, a leading Hausa digital news publication.',
    'Create 8 distinct, punchy, accurate news headlines in Hausa for the article below.',
    'Cover these 8 specific editorial styles:',
    '1. Standard: Direct, factual, authoritative journalistic news headline.',
    '2. Urgent/Breaking: High-impact, breaking news feel with urgency.',
    '3. Question: Engaging question drawing reader curiosity.',
    '4. Explainer: Context-driven, explanatory (e.g. "Dalilin da ya sa...", "Abin da ya kamata ku sani").',
    '5. Narrative: Human-interest / storytelling angle.',
    '6. Quote-Led: Centered around key statement or quote.',
    '7. Minimalist: Ultra-short, punchy (under 7 words).',
    '8. Analytical: Focused on impact, economic/social consequences.',
    '',
    'Reply with ONLY a JSON array of objects with structure: [{"style": "Standard", "headline": "..."}, ...]. No markdown fences, no other text.',
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

  let items: HeadlineItem[] = [];
  try {
    const raw = result.text.replace(/```(?:json)?/gi, '').trim();
    const start = raw.indexOf('[');
    const end = raw.lastIndexOf(']');
    if (start !== -1 && end > start) {
      const parsed = JSON.parse(raw.slice(start, end + 1));
      if (Array.isArray(parsed)) {
        items = parsed
          .map((item) => {
            if (typeof item === 'object' && item !== null) {
              const obj = item as Record<string, unknown>;
              return {
                style: sanitizePlainText(String(obj.style ?? 'Standard'), 50),
                headline: sanitizePlainText(String(obj.headline ?? ''), 200),
              };
            }
            if (typeof item === 'string') {
              return {
                style: 'Standard',
                headline: sanitizePlainText(item, 200),
              };
            }
            return null;
          })
          .filter((i): i is HeadlineItem => Boolean(i && i.headline));
      }
    }
  } catch {
    // fallback to plain array parsing
  }

  if (items.length === 0) {
    const fallbackList = extractJsonArray(result.text)
      .map((h) => sanitizePlainText(h, 200))
      .filter(Boolean);
    items = fallbackList.map((h, idx) => ({
      style: `Saló ${idx + 1}`,
      headline: h,
    }));
  }

  if (items.length === 0) return aiFailed('An kasa samun kanun labarai');

  const headlines = items.map((i) => i.headline);
  return json({ ok: true, headlines, items: items.slice(0, 8) });
};
