import type { APIRoute } from 'astro';
import { getActivePoll } from '../../../lib/polls';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, max-age=0',
    },
  });

export const GET: APIRoute = async () => {
  try {
    const poll = await getActivePoll();
    return json({ ok: true, poll });
  } catch (error) {
    console.error('[api/polls] GET error:', error);
    return json({ ok: false, message: 'Kuskure ya faru wajen dauko zabe' }, 500);
  }
};
