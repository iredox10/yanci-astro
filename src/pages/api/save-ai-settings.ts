import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { requireUser } from '@lib/auth';

export const prerender = false;

const SETTINGS_FILE = path.join(process.cwd(), '.autofetch-settings.json');

export const POST: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return new Response(JSON.stringify({ ok: false, message: 'Unauthorized' }), { status: auth.status });

  try {
    const body = await request.text();
    fs.writeFileSync(SETTINGS_FILE, body, 'utf-8');
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, message: err?.message }), { status: 500 });
  }
};
