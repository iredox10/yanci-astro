import type { APIRoute } from 'astro';
import { getSettings } from '@lib/appwrite-server';
import { sanitizePlainText } from '@lib/sanitize';
import { sendMail } from '@lib/mailer';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * POST /api/tipline
 *
 * Secure tip submission handler for whistleblower leaks and tips.
 * Sanitizes input and dispatches notification to newsroom desk.
 */
export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bayanan da aka tura ba su da inganci (Bad JSON).' }, 400);
  }

  const topic = sanitizePlainText(String(body.topic ?? ''), 200);
  const message = sanitizePlainText(String(body.message ?? ''), 10000);
  const fileLink = sanitizePlainText(String(body.fileLink ?? ''), 1000);
  const contactMethod = sanitizePlainText(String(body.contactMethod ?? ''), 300);

  if (!topic || !message) {
    return json(
      { ok: false, message: 'Jigo da cikakken bayanin labari wajibi ne (Topic and message are required).' },
      422,
    );
  }

  const settings = await getSettings();
  const to = settings.tipline_email || settings.contact_email || 'labulabari@yanci.ng';
  const siteName = settings.site_name || 'Yanci';

  const ok = await sendMail(settings, {
    to,
    subject: `[${siteName} TipLine] Sabon Bayani: ${topic}`,
    text: `[YANCI TIPLINE / WHISTLEBLOWER SUBMISSION]\n\nJigo: ${topic}\n\nHanyar Tuntuɓa: ${contactMethod || 'Ba a bayyana ba (Anonymous)'}\nHanyar Haɗin Fayil: ${fileLink || 'Babu'}\n\nBayanin Labari:\n${message}\n\nLokaci: ${new Date().toISOString()}`,
    html: `<h2>[${siteName} TipLine] Sabon Bayanin Sirri</h2>
<p><strong>Jigo:</strong> ${topic}</p>
<p><strong>Hanyar Tuntuɓa:</strong> ${contactMethod || '<em>Ba a bayyana ba (Anonymous)</em>'}</p>
<p><strong>Hanyar Haɗin Fayil:</strong> ${fileLink ? `<a href="${fileLink}">${fileLink}</a>` : '<em>Babu</em>'}</p>
<hr/>
<h3>Bayanin Labari:</h3>
<p>${message.replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>
<hr/>
<small>Lokaci: ${new Date().toISOString()}</small>`,
  });

  if (!ok) {
    return json(
      { ok: false, message: 'An samu matsala wajen aika bayanin. Don Allah sake gwadawa ko amfani da WhatsApp.' },
      500,
    );
  }

  return json({
    ok: true,
    message: 'Mun samu bayanan da kuka aiko cikin nasara. Muna godiya da amincewarku da Yanci.',
  });
};
