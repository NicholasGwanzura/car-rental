import { NextResponse } from "next/server";
import { hasWorkspaceSession } from "@/lib/workspace-auth";
import { loadWorkspaceData } from "@/lib/workspace-db";

export const runtime = "nodejs";
function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}
function money(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value); }
function dateLabel(value: string) { return new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Harare" }).format(new Date(`${value.slice(0, 10)}T12:00:00`)); }

export async function POST(request: Request) {
  if (!await hasWorkspaceSession()) return NextResponse.json({ error: "Sign in to send an invoice." }, { status: 401 });
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: "Invoice email is not configured on this service." }, { status: 503 });
  try {
    const body = await request.json() as { bookingId?: unknown };
    if (typeof body.bookingId !== "string") return NextResponse.json({ error: "Choose a booking first." }, { status: 400 });
    const data = await loadWorkspaceData() as { bookings: Record<string, unknown>[]; customers: Record<string, unknown>[]; vehicles: Record<string, unknown>[]; company?: Record<string, unknown> };
    const booking = data.bookings.find((item) => item.id === body.bookingId);
    if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    const customer = data.customers.find((item) => item.id === booking.customerId);
    if (!customer || typeof customer.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) return NextResponse.json({ error: "Add a valid customer email before sending an invoice." }, { status: 400 });
    const vehicle = data.vehicles.find((item) => item.id === booking.vehicleId);
    const company = data.company ?? {};
    const rentalTotal = Number(booking.total) || 0;
    const excess = Number(booking.excessMileageCharge) || 0;
    const total = rentalTotal + excess;
    const invoiceNo = `${String(company.invoicePrefix ?? "CR")}-${String(booking.reference ?? "").replace(/^BK-/, "")}`;
    const companyName = String(company.name ?? "Classic Rides");
    const vehicleName = vehicle ? `${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() : "Vehicle rental";
    const from = process.env.RESEND_FROM_EMAIL || "Classic Rides <sales@classicrides.online>";
    const details = `${dateLabel(String(booking.startDate))} – ${dateLabel(String(booking.endDate))}`;
    const mileageLine = excess > 0 ? `<tr><td style="padding:12px 0;border-top:1px solid #e8ece9">Excess mileage (${escapeHtml(booking.excessMileageKm)} km at ${escapeHtml(money(Number(booking.excessMileageRatePerKm) || 0))}/km)</td><td style="padding:12px 0;border-top:1px solid #e8ece9;text-align:right">${escapeHtml(money(excess))}</td></tr>` : "";
    const html = `<div style="font-family:Arial,sans-serif;color:#26372f;max-width:620px;margin:auto;padding:28px"><div style="color:#e98b4f;font-weight:bold;letter-spacing:2px">CLASSIC RIDES</div><h1 style="font-size:24px">Rental invoice ${escapeHtml(invoiceNo)}</h1><p>Hello ${escapeHtml(customer.name)},</p><p>Here is the invoice for your Classic Rides rental.</p><div style="background:#f7f9f7;padding:16px;border-radius:8px"><strong>${escapeHtml(vehicleName)}</strong><br/>${escapeHtml(details)}</div><table style="width:100%;border-collapse:collapse;margin-top:18px"><tbody><tr><td style="padding:12px 0;border-top:1px solid #e8ece9">Vehicle rental</td><td style="padding:12px 0;border-top:1px solid #e8ece9;text-align:right">${escapeHtml(money(rentalTotal))}</td></tr>${mileageLine}</tbody></table><p style="display:flex;justify-content:space-between;border-top:2px solid #26372f;padding-top:14px;font-size:18px"><strong>Total</strong><strong>${escapeHtml(money(total))}</strong></p>${company.paymentInstructions ? `<p><strong>Payment instructions</strong><br/>${escapeHtml(company.paymentInstructions)}</p>` : ""}<p style="color:#738078;font-size:13px">Questions? Email <a href="mailto:sales@classicrides.online">sales@classicrides.online</a> or call ${escapeHtml(company.phone ?? "")}</p><p>Thank you for choosing ${escapeHtml(companyName)}.</p></div>`;
    const text = `${companyName} invoice ${invoiceNo}\nCustomer: ${String(customer.name ?? "")}\nVehicle: ${vehicleName}\nDates: ${details}\nVehicle rental: ${money(rentalTotal)}${excess > 0 ? `\nExcess mileage (${booking.excessMileageKm} km): ${money(excess)}` : ""}\nTotal: ${money(total)}\nContact: sales@classicrides.online`;
    const result = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [customer.email], subject: `Classic Rides invoice ${invoiceNo}`, html, text }) });
    if (!result.ok) {
      const payload = await result.json().catch(() => null) as { message?: string } | null;
      console.error("Resend invoice request failed", result.status, payload?.message ?? "No response detail");
      return NextResponse.json({ error: "Resend could not deliver the invoice. Check your sender domain and email service configuration." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Invoice email failed", error);
    return NextResponse.json({ error: "Could not send this invoice." }, { status: 503 });
  }
}
