import { brandedCompany, whatsappDigits } from "@/lib/brand";
import { emailButton, emailLayout, escapeHtml } from "@/lib/email";

/** Branded transactional emails. Each returns the subject, HTML and plain-text versions. */

type CompanyLike = Record<string, string | undefined> | undefined;
export type EmailContent = { subject: string; html: string; text: string };

function money(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value); }
function longDate(value: string) { return new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Harare" }).format(new Date(value.length <= 10 ? `${value}T12:00:00` : value)); }
const p = (html: string, style = "") => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;${style}">${html}</p>`;
const muted = (html: string) => `<p style="margin:14px 0 0;color:#5e5e59;font-size:13px;line-height:1.6;">${html}</p>`;
const row = (label: string, amount: string, strong = false) => `<tr><td style="padding:11px 0;border-top:1px solid #ececea;font-size:14px;${strong ? "font-weight:700;" : ""}">${label}</td><td align="right" style="padding:11px 0;border-top:1px solid #ececea;font-size:14px;white-space:nowrap;${strong ? "font-weight:700;" : ""}">${amount}</td></tr>`;
const detailRow = (label: string, value: string) => `<tr><td style="padding:8px 12px 8px 0;color:#6f6f69;font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:8px 0;font-size:14px;line-height:1.5;">${value}</td></tr>`;

export function invoiceEmail(input: {
  company: CompanyLike;
  customerName: string;
  invoiceNo: string;
  vehicleName: string;
  startDate: string;
  endDate: string;
  rentalTotal: number;
  excess: number;
  excessKm?: number;
  excessRate?: number;
  deposit: number;
  depositStatus?: string;
  /** What happened to a settled deposit, e.g. "$70 returned, $30 kept for damage". */
  depositOutcome?: string;
  paid: boolean;
}): EmailContent {
  const details = brandedCompany(input.company);
  const total = input.rentalTotal + input.excess;
  const dates = `${longDate(input.startDate)} – ${longDate(input.endDate)}`;
  const instructions = !input.paid && input.company?.paymentInstructions?.trim() ? input.company.paymentInstructions.trim() : "";
  const depositNote = input.depositStatus === "Returned" ? ` (${input.depositOutcome || "settled"})` : input.depositStatus === "Held" ? " (held until the vehicle is returned and inspected)" : "";
  const html = emailLayout({
    company: input.company,
    preheader: `${input.paid ? "Paid" : "Amount due"}: ${money(total)} for ${input.vehicleName}`,
    heading: `Invoice ${input.invoiceNo}`,
    body: `${p(`Hello ${escapeHtml(input.customerName)},`)}
${p(`Here is the invoice for your ${escapeHtml(details.name)} rental.`, "margin-bottom:18px;")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f3;border-radius:10px;"><tr><td style="padding:14px 16px;font-size:14px;line-height:1.6;"><strong>${escapeHtml(input.vehicleName)}</strong><br>${escapeHtml(dates)}</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
${row("Vehicle rental", escapeHtml(money(input.rentalTotal)))}
${input.excess > 0 ? row(`Excess mileage (${escapeHtml(input.excessKm ?? 0)} km at ${escapeHtml(money(input.excessRate ?? 0))}/km)`, escapeHtml(money(input.excess))) : ""}
<tr><td style="padding:14px 0 4px;border-top:2px solid #1f2420;font-size:17px;font-weight:800;">${input.paid ? "Amount paid" : "Total due"}</td><td align="right" style="padding:14px 0 4px;border-top:2px solid #1f2420;font-size:17px;font-weight:800;">${escapeHtml(money(total))}</td></tr>
</table>
${input.paid ? `<p style="margin:14px 0 0;padding:10px 14px;border-radius:8px;background:#ecf8f0;color:#1d6b42;font-size:14px;font-weight:700;">Paid in full. Thank you.</p>` : ""}
${input.deposit > 0 ? muted(`Refundable vehicle deposit: ${escapeHtml(money(input.deposit))}${depositNote}.`) : ""}
${instructions ? `<p style="margin:18px 0 0;font-size:14px;line-height:1.6;"><strong>How to pay</strong><br>${escapeHtml(instructions).replace(/\n/g, "<br>")}</p>` : ""}
${muted(`Questions? Reply to this email or call ${escapeHtml(details.phone)}.`)}
<p style="margin:14px 0 0;font-size:14px;">Thank you for choosing ${escapeHtml(details.name)}.</p>`,
  });
  const text = [
    `${details.name} invoice ${input.invoiceNo}`,
    `Customer: ${input.customerName}`,
    `Vehicle: ${input.vehicleName}`,
    `Dates: ${dates}`,
    `Vehicle rental: ${money(input.rentalTotal)}`,
    input.excess > 0 ? `Excess mileage (${input.excessKm ?? 0} km): ${money(input.excess)}` : "",
    `${input.paid ? "Amount paid" : "Total due"}: ${money(total)}`,
    input.deposit > 0 ? `Refundable deposit: ${money(input.deposit)}${depositNote}` : "",
    instructions ? `\nHow to pay:\n${instructions}` : "",
    `\nQuestions? Reply to this email or call ${details.phone}.`,
    `${details.name} Car Rental · ${details.address} · ${details.website}`,
  ].filter(Boolean).join("\n");
  return { subject: `${details.name} invoice ${input.invoiceNo}${input.paid ? " (paid)" : ""}`, html, text };
}

export function inviteEmail(input: { company: CompanyLike; inviterName: string; role: "manager" | "sales"; invitationUrl: string; expiresAt: string }): EmailContent {
  const details = brandedCompany(input.company);
  const roleLabel = input.role === "manager" ? "manager" : "sales team member";
  const expires = longDate(input.expiresAt);
  const html = emailLayout({
    company: input.company,
    preheader: `${input.inviterName} invited you to the ${details.name} workspace.`,
    heading: `Join the ${details.name} workspace`,
    body: `${p(`${escapeHtml(input.inviterName)} has invited you to join the ${escapeHtml(details.name)} rental workspace as a <strong>${escapeHtml(roleLabel)}</strong>.`)}
${p(`You’ll be able to manage bookings, the fleet, customers and vehicle inspections${input.role === "manager" ? ", plus maintenance, reports and expenses" : ""}.`, "margin-bottom:0;")}
${emailButton(input.invitationUrl, "Accept invitation")}
<p style="margin:0 0 6px;color:#5e5e59;font-size:13px;line-height:1.6;">This invitation expires on ${escapeHtml(expires)}. If the button doesn’t work, copy this link into your browser:</p>
<p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;"><a href="${escapeHtml(input.invitationUrl)}" style="color:#1f715e;">${escapeHtml(input.invitationUrl)}</a></p>
<p style="margin:18px 0 0;color:#8a8a84;font-size:12px;line-height:1.6;">Weren’t expecting this? You can ignore this email; no account is created unless you accept.</p>`,
  });
  const text = `${input.inviterName} has invited you to join the ${details.name} rental workspace as a ${roleLabel}.\n\nAccept your invitation: ${input.invitationUrl}\nThis link expires on ${expires}.\n\nWeren’t expecting this? Ignore this email; no account is created unless you accept.\n\n${details.name} Car Rental · ${details.website}`;
  return { subject: `You’re invited to the ${details.name} workspace`, html, text };
}

export function prebookingAlertEmail(input: { company: CompanyLike; reference: string; vehicleName: string; registration?: string; customerName: string; phone: string; email?: string; driverLicence?: string; startDate?: string; endDate?: string; estimate?: number; message?: string; workspaceUrl: string }): EmailContent {
  const hasDates = Boolean(input.startDate && input.endDate);
  const dates = hasDates ? `${longDate(input.startDate as string)} – ${longDate(input.endDate as string)}` : "No dates requested — call to confirm availability";
  const waNumber = whatsappDigits(input.phone);
  const html = emailLayout({
    company: input.company,
    preheader: `${input.customerName} wants the ${input.vehicleName}.`,
    heading: "New pre-booking request",
    body: `${p(`<strong>${escapeHtml(input.customerName)}</strong> sent a pre-booking request from the website. Call them back to confirm availability, then create the booking in the workspace.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 6px;">
${detailRow("Reference", escapeHtml(input.reference))}
${detailRow("Vehicle", `${escapeHtml(input.vehicleName)}${input.registration ? ` · ${escapeHtml(input.registration)}` : ""}`)}
${detailRow("Dates", escapeHtml(dates))}
${input.estimate ? detailRow("Estimate", escapeHtml(money(input.estimate))) : ""}
${detailRow("Phone", `<a href="tel:${escapeHtml(input.phone.replace(/\s+/g, ""))}" style="color:#1f715e;">${escapeHtml(input.phone)}</a>${waNumber ? ` · <a href="https://wa.me/${escapeHtml(waNumber)}" style="color:#1f715e;">WhatsApp</a>` : ""}`)}
${input.email ? detailRow("Email", `<a href="mailto:${escapeHtml(input.email)}" style="color:#1f715e;">${escapeHtml(input.email)}</a>`) : ""}
${input.driverLicence ? detailRow("Driver licence", escapeHtml(input.driverLicence)) : ""}
${input.message ? detailRow("Note", escapeHtml(input.message).replace(/\n/g, "<br>")) : ""}
</table>
${emailButton(input.workspaceUrl, "Open pre-booking requests")}
${muted("Reply to this email to answer the customer directly.")}`,
  });
  const text = [
    `New pre-booking request ${input.reference}`,
    `Customer: ${input.customerName}`,
    `Vehicle: ${input.vehicleName}${input.registration ? ` · ${input.registration}` : ""}`,
    `Dates: ${dates}`,
    input.estimate ? `Estimate: ${money(input.estimate)}` : "",
    `Phone: ${input.phone}`,
    input.email ? `Email: ${input.email}` : "",
    input.driverLicence ? `Driver licence: ${input.driverLicence}` : "",
    input.message ? `Note: ${input.message}` : "",
    `\nOpen pre-booking requests: ${input.workspaceUrl}`,
    `Reply to this email to answer the customer directly.`,
  ].filter(Boolean).join("\n");
  return { subject: `New pre-booking: ${input.customerName} · ${input.vehicleName}`, html, text };
}
