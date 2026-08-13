import type { APIRoute } from 'astro';
import { subscribeNewsletter, unsubscribeNewsletter, getSettings } from '../../lib/appwrite-server';
import { sendMail } from '../../lib/mailer';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let email = '';
  let action = 'subscribe';
  try {
    const json = await request.json();
    email = String(json?.email ?? '').trim();
    action = String(json?.action ?? 'subscribe');
  } catch {
    return new Response(JSON.stringify({ ok: false, message: 'Bad JSON' }), { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ ok: false, message: 'Invalid email' }), { status: 422 });
  }

  try {
    const ok = action === 'unsubscribe' ? await unsubscribeNewsletter(email) : await subscribeNewsletter(email);
    if (!ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          message: action === 'unsubscribe' ? 'Not subscribed' : 'Subscription unavailable',
        }),
        { status: action === 'unsubscribe' ? 404 : 503 },
      );
    }
    if (action === 'subscribe') {
      const settings = await getSettings();
      const siteName = settings.site_name || 'Yanci';
      await sendMail(settings, {
        to: email,
        subject: `Barka da zuwa ${siteName}!`,
        text: `Na gode da yin rajista a jaridar ${siteName}. Za ku sami labarai masu zafi kai tsaye a akwatin imelinku.\n\nIdan ba ku so kuka ci gaba da samun sakonni, amfani da hanyar "Cire rajista" a shafinmu.`,
        html: `<p>Barka da zuwa <strong>${siteName}</strong>!</p><p>Za ku sami labarai masu zafi kai tsaye a akwatin imelinku.</p>`,
      });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, message: 'Server error' }), { status: 500 });
  }
};