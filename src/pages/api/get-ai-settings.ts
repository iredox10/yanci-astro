import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';

export const prerender = false;

const SETTINGS_FILE = path.join(process.cwd(), '.autofetch-settings.json');

export const GET: APIRoute = async () => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return new Response(data, { headers: { 'Content-Type': 'application/json' } });
    }
  } catch {}
  return new Response(JSON.stringify({ provider: 'Gemini', model: 'gemini-1.5-flash' }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
