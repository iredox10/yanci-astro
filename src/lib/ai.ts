import { hasRole, requireUser } from '@lib/auth';
import { sanitizePlainText } from '@lib/sanitize';

/**
 * Server-side Gemini proxy helpers. The API key stays inside this module and
 * is never logged or returned; callers get extracted text or a typed failure.
 */

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-3.1-flash-lite';

export type GeminiErrorCode =
  | 'not_configured'
  | 'timeout'
  | 'network'
  | 'rate_limited'
  | 'upstream'
  | 'bad_response';

export type GeminiResult =
  | { ok: true; text: string }
  | { ok: false; error: GeminiErrorCode };

export interface CallGeminiOptions {
  /** Per-attempt timeout (default 20s). */
  timeoutMs?: number;
  /** Extra attempts after the first (default 1) on transient failures. */
  retries?: number;
  temperature?: number;
  /** Ask the model for strict JSON output. */
  json?: boolean;
}

interface GenerateContentResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  promptFeedback?: { blockReason?: string };
}

export function geminiApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY;
  return key && key.trim() ? key.trim() : undefined;
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

function extractText(data: GenerateContentResponse): string {
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p) => p.text ?? '').join('').trim();
}

async function postGenerate(
  key: string,
  prompt: string,
  opts: CallGeminiOptions,
  signal: AbortSignal,
): Promise<Response> {
  const generationConfig: Record<string, unknown> = {};
  if (opts.temperature !== undefined) generationConfig.temperature = opts.temperature;
  if (opts.json) generationConfig.responseMimeType = 'application/json';

  return fetch(
    `${GEMINI_ENDPOINT}/${encodeURIComponent(geminiModel())}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        ...(Object.keys(generationConfig).length ? { generationConfig } : {}),
      }),
      signal,
    },
  );
}

export async function callGemini(prompt: string, opts: CallGeminiOptions = {}): Promise<GeminiResult> {
  const key = geminiApiKey();
  if (!key) return { ok: false, error: 'not_configured' };

  const { timeoutMs = 20_000, retries = 1 } = opts;
  let last: GeminiErrorCode = 'network';

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await postGenerate(key, prompt, opts, controller.signal);
      if (res.ok) {
        const data = (await res.json()) as GenerateContentResponse;
        const text = extractText(data);
        return text ? { ok: true, text } : { ok: false, error: 'bad_response' };
      }
      if (res.status === 429) last = 'rate_limited';
      else if (res.status < 500 && res.status >= 400) return { ok: false, error: 'upstream' };
      else last = 'upstream';
      console.error('[ai] gemini responded with http', res.status);
    } catch (err) {
      last = (err as { name?: string } | null)?.name === 'AbortError' ? 'timeout' : 'network';
    } finally {
      clearTimeout(timer);
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, 750));
  }
  return { ok: false, error: last };
}

/** Pull a JSON string array out of a model reply, tolerating fences/prose. */
export function extractJsonArray(input: string): string[] {
  const stripped = input.replace(/```(?:json)?/gi, '').trim();
  const start = stripped.indexOf('[');
  const end = stripped.lastIndexOf(']');
  if (start === -1 || end <= start) {
    return stripped
      .split('\n')
      .map((line) => line.replace(/^[-*\d.\s"[]+|["\]]+$/g, '').trim())
      .filter(Boolean);
  }
  try {
    const parsed: unknown = JSON.parse(stripped.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

// ── Shared route plumbing ────────────────────────────────────────────────

export const MAX_AI_INPUT_CHARS = 8000;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

/** Auth gate matching the admin newsletter API: logged-in staff, editor+. */
export async function guardStaff(request: Request): Promise<Response | null> {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'editor')) return json({ ok: false, message: 'Forbidden' }, 403);
  return null;
}

export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

// Naive IP-hash rate limiting, same spirit as api/push/subscribe. Shared
// window across all /api/ai endpoints: 10 calls per minute per IP.
const _recent = new Map<string, number[]>();
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [k, hits] of _recent) {
    const alive = hits.filter((t) => t >= cutoff);
    if (alive.length === 0) _recent.delete(k);
    else _recent.set(k, alive);
  }
}, 300_000).unref();

export function aiRateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - 60_000;
  const hits = (_recent.get(ip) ?? []).filter((t) => t >= cutoff);
  if (hits.length >= 10) return true;
  hits.push(now);
  _recent.set(ip, hits);
  return false;
}

/** Parse + validate + sanitize the {text} body shared by the AI endpoints. */
export async function readAiText(
  request: Request,
  max = MAX_AI_INPUT_CHARS,
): Promise<{ ok: true; text: string } | { ok: false; response: Response }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, response: json({ ok: false, message: 'Bad JSON' }, 400) };
  }
  const raw =
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>).text
      : undefined;
  if (typeof raw !== 'string' || !raw.trim()) {
    return { ok: false, response: json({ ok: false, message: 'Text is required' }, 422) };
  }
  if (raw.length > 32_000) {
    return { ok: false, response: json({ ok: false, message: 'Text too long' }, 413) };
  }
  const text = sanitizePlainText(raw, max);
  if (!text) {
    return { ok: false, response: json({ ok: false, message: 'Text is required' }, 422) };
  }
  return { ok: true, text };
}

export function aiUnavailable(): Response {
  return json({ ok: false, message: 'Ba a saita AI ba tukuna' }, 503);
}

export function aiFailed(message = 'An kasa samun sakamako daga AI'): Response {
  return json({ ok: false, message }, 502);
}
