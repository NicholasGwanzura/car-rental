import { BRAND, brandedCompany, type BrandedCompany } from "@/lib/brand";
import type { CompanyProfile } from "@/lib/rental-data";

/**
 * Transactional email through Resend (https://resend.com/docs/api-reference/emails/send-email).
 * Every send goes through here so timeouts, reply-to, idempotency and error handling are consistent.
 */

export type EmailResult =
  | { ok: true; id: string }
  | { ok: false; reason: "not-configured" | "rejected" | "network"; status?: number; message: string };

const RESEND_URL = "https://api.resend.com/emails";
const TIMEOUT_MS = 10_000;

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function senderAddress() {
  return process.env.RESEND_FROM_EMAIL?.trim() || "Classic Rides <sales@classicrides.online>";
}

export async function sendEmail({ to, subject, html, text, replyTo, idempotencyKey, category }: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string | string[];
  /** Resend ignores a repeat send with the same key for 24 hours, so a double click can't send twice. */
  idempotencyKey?: string;
  /** Short label used for logs and Resend tags, e.g. "invoice". */
  category: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, reason: "not-configured", message: "Email delivery isn’t set up yet. Add RESEND_API_KEY to the server settings." };
  try {
    const response = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey.slice(0, 256) } : {}),
      },
      body: JSON.stringify({
        from: senderAddress(),
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
        tags: [{ name: "category", value: category.replace(/[^a-zA-Z0-9_-]/g, "_") }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const payload = await response.json().catch(() => null) as { id?: string; name?: string; message?: string } | null;
    if (!response.ok) {
      // Log the reason, not the recipient address.
      console.error(`Resend rejected ${category} email`, { status: response.status, name: payload?.name, message: payload?.message });
      return { ok: false, reason: "rejected", status: response.status, message: explainRejection(response.status, payload?.message) };
    }
    return { ok: true, id: payload?.id ?? "" };
  } catch (error) {
    console.error(`Resend ${category} email failed`, error instanceof Error ? error.name : error);
    return { ok: false, reason: "network", message: "The email service didn’t respond. Try again in a moment." };
  }
}

function explainRejection(status: number, detail?: string) {
  const text = (detail ?? "").toLowerCase();
  if (status === 401 || (status === 403 && text.includes("api key"))) return "The email service rejected the API key. Check RESEND_API_KEY.";
  if (status === 403 || text.includes("domain") || text.includes("verify")) return "The sender domain isn’t verified in Resend yet, so the email can’t be sent. Finish the domain’s DNS setup in Resend.";
  if (status === 422) return "The email service couldn’t accept this message. Check the recipient address and sender settings.";
  if (status === 429) return "Too many emails were sent at once. Wait a minute and try again.";
  return "The email service couldn’t send this message. Try again shortly.";
}

export function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

/** Email-client-safe branded layout (tables and inline styles only). */
export function emailLayout({ company, preheader, heading, body }: { company: Partial<CompanyProfile> | undefined; preheader: string; heading: string; body: string }) {
  const details: BrandedCompany = brandedCompany(company);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f0;">
<span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#1f2420;">
<tr><td style="background:${BRAND.ink};padding:20px 28px;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="width:36px;height:36px;background:${BRAND.accent};border-radius:9px;color:${BRAND.ink};font-weight:800;font-size:15px;text-align:center;vertical-align:middle;">CR</td>
    <td style="padding-left:12px;"><div style="color:#ffffff;font-size:15px;font-weight:800;letter-spacing:1.5px;">${escapeHtml(details.name.toUpperCase())}</div><div style="color:#9a9a94;font-size:11px;font-weight:700;letter-spacing:2.4px;">CAR RENTAL</div></td>
  </tr></table>
</td></tr>
<tr><td style="height:4px;background:${BRAND.accent};line-height:4px;font-size:0;">&nbsp;</td></tr>
<tr><td style="padding:28px;">
  <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${BRAND.ink};">${escapeHtml(heading)}</h1>
  ${body}
</td></tr>
<tr><td style="padding:18px 28px 24px;border-top:1px solid #ececea;color:#6f6f69;font-size:12px;line-height:1.6;">
  ${escapeHtml(details.name)} Car Rental · ${escapeHtml(details.address)}<br>
  ${escapeHtml(details.phone)} · ${details.emails.map((address) => `<a href="mailto:${escapeHtml(address)}" style="color:#6f6f69;">${escapeHtml(address)}</a>`).join(" · ")} · <a href="https://${escapeHtml(details.website)}" style="color:#6f6f69;">${escapeHtml(details.website)}</a>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export function emailButton(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr><td style="background:${BRAND.accent};border-radius:999px;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">${escapeHtml(label)}</a></td></tr></table>`;
}
