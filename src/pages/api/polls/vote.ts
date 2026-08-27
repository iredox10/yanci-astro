import type { APIRoute } from 'astro';
import { recordVote } from '../../../lib/polls';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, max-age=0',
    },
  });

export const POST: APIRoute = async ({ request }) => {
  let body: { pollId?: unknown; optionId?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bayanan da aka tura ba su yi daidai ba' }, 400);
  }

  const pollId = String(body?.pollId ?? '').trim();
  const optionId = String(body?.optionId ?? '').trim();

  if (!pollId || !optionId) {
    return json({ ok: false, message: 'Ana bukatar pollId da optionId' }, 422);
  }

  try {
    const updatedPoll = await recordVote(pollId, optionId);
    if (!updatedPoll) {
      return json({ ok: false, message: 'Ba a sami wannan zabin ko kuri’ar ba' }, 404);
    }

    return json({ ok: true, poll: updatedPoll }, 200);
  } catch (error) {
    console.error('[api/polls/vote] POST error:', error);
    return json({ ok: false, message: 'Kuskure ya faru wajen kada kuri’a' }, 500);
  }
};
