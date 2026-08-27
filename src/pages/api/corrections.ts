import type { APIRoute } from 'astro';
import { getSettings } from '@lib/appwrite-server';
import { sanitizePlainText } from '@lib/sanitize';
import { sendMail } from '@lib/mailer';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * POST /api/corrections
 *
 * Forwards reader correction requests to the editorial desk.
 */
export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  const article = sanitizePlainText(String(body.article ?? ''), 300);
  const errorDetails = sanitizePlainText(String(body.errorDetails ?? body.error_details ?? ''), 4000);
  const correctInfo = sanitizePlainText(String(body.correctInfo ?? body.correct_info ?? ''), 4000);
  const name = sanitizePlainText(String(body.name ?? ''), 120);
  const email = sanitizePlainText(String(body.email ?? ''), 320);

  if (!article || !errorDetails || !correctInfo || !email) {
    return json({ ok: false, message: 'Duk bayanan da ake buƙata wajibi ne a cike su.' }, 422);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, message: 'Ingantaccen adireshin imel ake buƙata.' }, 422);
  }

  const settings = await getSettings();
  const to = settings.contact_email || 'labulabari@yanci.ng';
  const siteName = settings.site_name || 'Yanci';

  const senderLabel = name ? `${name} <${email}>` : email;
  const subject = `[${siteName} - Gyaran Kuskure] ${article.slice(0, 60)}`;

  const textBody = `KOKEN GYARAN KUSKURE
------------------------------------------
Labari / URL: ${article}
Mai aiko da sako: ${senderLabel}

BAYANIN KUSKURE:
${errorDetails}

CIKAKKEN BAYANIN GASKIYA DA HUJJA:
${correctInfo}
`;

  const htmlBody = `
    <h2>Koken Gyaran Kuskure</h2>
    <p><strong>Labari / URL:</strong> ${article}</p>
    <p><strong>Mai Aiko da Sako:</strong> ${senderLabel}</p>
    <hr />
    <h3>Bayanin Kuskure:</h3>
    <p>${errorDetails.replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>
    <h3>Cikakken Bayanin Gaskiya da Hujja:</h3>
    <p>${correctInfo.replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>
  `;

  const ok = await sendMail(settings, {
    to,
    subject,
    text: textBody,
    html: htmlBody,
  });

  if (!ok) {
    return json({ ok: false, message: 'Ba a iya tura sakon ba a yanzu. Da fatan a sake gwadawa.' }, 500);
  }

  return json({ ok: true, message: 'Mun gode! Mun samu kokenka na gyara. Editocinmu za su duba shi cikin gaggawa.' });
};
