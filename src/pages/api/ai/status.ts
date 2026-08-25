import type { APIRoute } from 'astro';
import { geminiApiKey, geminiModel } from '@lib/ai';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * GET /api/ai/status — health probe. Reports whether GEMINI_API_KEY is set
 * without ever returning the key itself.
 */
export const GET: APIRoute = async () => {
  return json({ ok: true, configured: Boolean(geminiApiKey()), model: geminiModel() });
};
