import { afterEach, describe, expect, it, vi } from "vitest";
import { emailLayout, sendEmail } from "./email";
import { invoiceEmail, inviteEmail, prebookingAlertEmail } from "./email-templates";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("sendEmail", () => {
  it("reports when email isn't configured without calling Resend", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await sendEmail({ to: "a@b.co", subject: "s", html: "h", text: "t", category: "test" });
    expect(result).toMatchObject({ ok: false, reason: "not-configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends reply-to, tags and an idempotency key", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("RESEND_FROM_EMAIL", "Classic Rides <sales@classicrides.online>");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "email_123" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await sendEmail({ to: "a@b.co", subject: "Hi", html: "<p>h</p>", text: "t", replyTo: "sales@classicrides.online", idempotencyKey: "invoice-1", category: "invoice" });
    expect(result).toEqual({ ok: true, id: "email_123" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers["Idempotency-Key"]).toBe("invoice-1");
    expect(JSON.parse(init.body)).toMatchObject({ from: "Classic Rides <sales@classicrides.online>", to: ["a@b.co"], reply_to: "sales@classicrides.online", tags: [{ name: "category", value: "invoice" }] });
  });

  it("explains an unverified sender domain", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ name: "validation_error", message: "The classicrides.online domain is not verified." }), { status: 403 })));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = await sendEmail({ to: "a@b.co", subject: "s", html: "h", text: "t", category: "invoice" });
    expect(result).toMatchObject({ ok: false, reason: "rejected", status: 403 });
    expect(result.ok ? "" : result.message).toMatch(/domain isn’t verified/);
  });

  it("handles a timeout or network failure", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError")));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await sendEmail({ to: "a@b.co", subject: "s", html: "h", text: "t", category: "invoice" })).toMatchObject({ ok: false, reason: "network" });
  });
});

describe("branded templates", () => {
  it("uses company defaults when settings are blank and escapes customer input", () => {
    const html = emailLayout({ company: { name: "", email: "", phone: "", address: "" }, preheader: "x", heading: "<b>Hi</b>", body: "" });
    expect(html).toContain("CLASSIC RIDES");
    expect(html).toContain("sales@classicrides.online");
    expect(html).toContain("Harare, Zimbabwe");
    expect(html).toContain("&lt;b&gt;Hi&lt;/b&gt;");
    expect(html).not.toContain("display:flex");
  });

  it("shows paid invoices as paid and hides payment instructions", () => {
    const base = { company: { paymentInstructions: "EcoCash 0772" }, customerName: "Tendai <script>", invoiceNo: "CR-1", vehicleName: "Honda Fit", startDate: "2026-11-01", endDate: "2026-11-03", rentalTotal: 70, excess: 0, deposit: 100, depositStatus: "Held" };
    const paid = invoiceEmail({ ...base, paid: true });
    expect(paid.subject).toBe("Classic Rides invoice CR-1 (paid)");
    expect(paid.html).toContain("Paid in full");
    expect(paid.html).not.toContain("EcoCash");
    expect(paid.html).toContain("Tendai &lt;script&gt;");
    const due = invoiceEmail({ ...base, paid: false });
    expect(due.html).toContain("Total due");
    expect(due.html).toContain("EcoCash 0772");
    expect(due.text).toContain("How to pay");
  });

  it("builds invite and pre-booking alert emails", () => {
    const invite = inviteEmail({ company: undefined, inviterName: "Nick", role: "sales", invitationUrl: "https://classicrides.online/invite/abc", expiresAt: "2026-11-13T10:00:00Z" });
    expect(invite.html).toContain("Accept invitation");
    expect(invite.text).toContain("https://classicrides.online/invite/abc");
    const alert = prebookingAlertEmail({ company: undefined, reference: "AB12", vehicleName: "2023 Toyota Corolla Cross", customerName: "Rudo", email: "r@x.co", phone: "+263 77 123 4567", driverLicence: "DL1", startDate: "2026-11-10", endDate: "2026-11-12", estimate: 130, workspaceUrl: "https://classicrides.online/bookings" });
    expect(alert.subject).toBe("New pre-booking: Rudo · 2023 Toyota Corolla Cross");
    expect(alert.html).toContain("https://wa.me/263771234567");
  });
});
