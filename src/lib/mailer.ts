import nodemailer, { type Transporter } from 'nodemailer';
import type { Options as MailOptions } from 'nodemailer/lib/mailer';

let transporter: Transporter | null = null;
let lastConfig = '';

export interface MailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  enabled: boolean;
}

export function mailConfig(settings: Record<string, string>): MailConfig {
  const host = String(settings.smtp_host ?? '').trim();
  const user = String(settings.smtp_user ?? '').trim();
  const pass = String(settings.smtp_pass ?? '').trim();
  const port = Number(settings.smtp_port ?? 0);
  const from = String(settings.smtp_from ?? settings.smtp_user ?? '').trim();
  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 587,
    user,
    pass,
    from,
    enabled: Boolean(host && user && pass),
  };
}

function transporterFor(settings: Record<string, string>): Transporter | null {
  const cfg = mailConfig(settings);
  if (!cfg.enabled) return null;
  const key = [cfg.host, cfg.port, cfg.user].join('|');
  if (!transporter || key !== lastConfig) {
    transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    });
    lastConfig = key;
  }
  return transporter;
}

/**
 * Send an email when SMTP is configured in settings; otherwise log the message
 * (so behaviour before SMTP setup stays crash-free and observable).
 * Returns true when accepted by the transport (or logged), false on failure.
 */
export async function sendMail(
  settings: Record<string, string>,
  opts: { to: string; subject: string; text?: string; html?: string },
): Promise<boolean> {
  const cfg = mailConfig(settings);
  const fallback = String(settings.email_fallback ?? 'true') === 'true';
  if (!cfg.enabled) {
    if (fallback) {
      console.log(
        `[mail] SMTP not configured — would send to=${opts.to} subject="${opts.subject}"`,
      );
    }
    return fallback;
  }
  try {
    const t = transporterFor(settings);
    if (!t) return false;
    const from = cfg.from || cfg.user;
    const info = await t.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    } satisfies MailOptions);
    return Boolean(info.accepted.length || info.messageId);
  } catch (error) {
    console.error('[mail] sendMail failed', error);
    return false;
  }
}