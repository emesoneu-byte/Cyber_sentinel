import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    const port = config.email.smtpPort;
    const secure = config.email.smtpSecure || port === 465;
    transporter = nodemailer.createTransport({
      host: config.email.smtpHost,
      port,
      secure,
      auth: config.email.smtpUser
        ? { user: config.email.smtpUser, pass: config.email.smtpPass }
        : undefined,
      // Port 587 (STARTTLS) used by Gmail / Brevo / Outlook
      requireTLS: !secure && port === 587,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
      tls: { rejectUnauthorized: config.nodeEnv === 'production' },
    });
  }
  return transporter;
}

/** Reset cached transport after .env changes (dev). */
export function resetMailer(): void {
  transporter = null;
}

export async function verifyMailer(): Promise<{ ok: boolean; error?: string }> {
  try {
    await getTransporter().verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export interface SendSimEmailParams {
  to: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  htmlBody: string;
  trackingToken: string;
}

export function injectTracking(htmlBody: string, trackingToken: string): string {
  const base = config.email.trackingBaseUrl.replace(/\/$/, '');
  const pixel = `<img src="${base}/open/${trackingToken}" width="1" height="1" style="display:none" alt=""/>`;
  let html = htmlBody.replace(/\{\{TRACKING_LINK\}\}/g, `${base}/click/${trackingToken}`);
  // Optional training banner (set CAMPAIGN_SHOW_BANNER=true for ethics/viva clarity)
  if (process.env.CAMPAIGN_SHOW_BANNER === 'true') {
    const banner = `<div style="background:#FEF3C7;color:#92400E;padding:8px 12px;font-size:12px;font-family:Arial,sans-serif;border-bottom:1px solid #F59E0B;">
      <strong>CyberSentinel training simulation</strong> — this is a controlled phishing exercise, not a real threat.
    </div>`;
    html = banner + html;
  }
  html = html.includes('</body>') ? html.replace('</body>', `${pixel}</body>`) : html + pixel;
  return html;
}

/**
 * Real delivery notes:
 * - Gmail/Outlook/Brevo will not reliably deliver mail "From" a random spoofed domain.
 * - We send FROM your authenticated mailbox (EMAIL_FROM / SMTP_USER) using the template's
 *   senderName as the display name, so messages actually arrive for the project demo.
 * - The simulated sender address is kept in headers + HTML for training realism.
 */
export async function sendSimulationEmail(
  params: SendSimEmailParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const envelopeFrom = config.email.fromAddress || config.email.smtpUser;
    if (!envelopeFrom) {
      return {
        success: false,
        error: 'EMAIL_FROM / SMTP_USER not set — configure SMTP in backend/.env for real delivery',
      };
    }
    if (!config.email.smtpHost || config.email.smtpHost === 'localhost') {
      // Still attempt send (MailHog etc.) but surface a clear hint on failure
    }

    const displayName = params.senderName || 'CyberSentinel Training';
    const html = injectTracking(params.htmlBody, params.trackingToken);

    await getTransporter().sendMail({
      // Real mailbox that can send (authenticated)
      from: `"${displayName}" <${envelopeFrom}>`,
      to: params.to,
      subject: params.subject,
      html,
      replyTo: params.senderEmail || envelopeFrom,
      headers: {
        'X-CyberSentinel-Simulation': 'true',
        'X-Simulated-From': `${params.senderName} <${params.senderEmail}>`,
      },
    });
    return { success: true };
  } catch (err) {
    const msg = (err as Error).message || String(err);
    let hint = msg;
    if (/Invalid login|EAUTH|535/i.test(msg)) {
      hint = `${msg} — For Gmail use an App Password (Google Account → Security → App passwords), not your normal password.`;
    } else if (/ECONNREFUSED|ENOTFOUND/i.test(msg)) {
      hint = `${msg} — Check SMTP_HOST and SMTP_PORT (Gmail: smtp.gmail.com:465 or 587).`;
    }
    return { success: false, error: hint };
  }
}

/** Simple non-simulation test message to confirm SMTP works. */
export async function sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
  try {
    const envelopeFrom = config.email.fromAddress || config.email.smtpUser;
    if (!envelopeFrom) return { success: false, error: 'EMAIL_FROM not configured' };
    await getTransporter().sendMail({
      from: `"CyberSentinel" <${envelopeFrom}>`,
      to,
      subject: 'CyberSentinel SMTP test',
      text: 'Your SMTP configuration works. Campaign emails can be delivered from this server.',
      html: '<p>Your <strong>SMTP configuration works</strong>.</p><p>Campaign emails can be delivered from this server.</p>',
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
