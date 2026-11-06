import { NextResponse } from "next/server";
import { brandedCompany } from "@/lib/brand";
import { emailConfigured, sendEmail } from "@/lib/email";
import { invoiceEmail } from "@/lib/email-templates";
import { hasWorkspaceSession } from "@/lib/workspace-auth";
import { loadWorkspaceData } from "@/lib/workspace-db";

export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  if (!await hasWorkspaceSession()) return NextResponse.json({ error: "Sign in to send an invoice." }, { status: 401 });
  if (!emailConfigured()) return NextResponse.json({ error: "Invoice email isn’t set up on this service yet. Add RESEND_API_KEY to the server settings." }, { status: 503 });
  try {
    const body = await request.json() as { bookingId?: unknown };
    if (typeof body.bookingId !== "string") return NextResponse.json({ error: "Choose a booking first." }, { status: 400 });
    const data = await loadWorkspaceData() as { bookings: Record<string, unknown>[]; customers: Record<string, unknown>[]; vehicles: Record<string, unknown>[]; company?: Record<string, unknown> };
    const booking = data.bookings.find((item) => item.id === body.bookingId);
    if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    if (booking.status === "Cancelled") return NextResponse.json({ error: "This booking is cancelled, so there’s no invoice to send." }, { status: 400 });
    const customer = data.customers.find((item) => item.id === booking.customerId);
    const customerEmail = typeof customer?.email === "string" ? customer.email.trim() : "";
    if (!customer || !EMAIL_PATTERN.test(customerEmail)) return NextResponse.json({ error: "Add a valid customer email before sending an invoice." }, { status: 400 });

    const vehicle = data.vehicles.find((item) => item.id === booking.vehicleId);
    const company = (data.company ?? {}) as Record<string, string | undefined>;
    const details = brandedCompany(company);
    const rentalTotal = Number(booking.total) || 0;
    const excess = Number(booking.excessMileageCharge) || 0;
    const deposit = Number(booking.depositAmount) || 0;
    const paid = booking.paymentStatus === "Paid";
    // Same prefix rule as the invoice on screen.
    const invoiceNo = `${(company.invoicePrefix || "CR").trim()}-${String(booking.reference ?? "").replace(/^BK-/, "")}`;
    const vehicleName = vehicle ? `${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() + (vehicle.registration ? ` · ${vehicle.registration}` : "") : "Vehicle rental";
    const content = invoiceEmail({ company, customerName: String(customer.name ?? ""), invoiceNo, vehicleName, startDate: String(booking.startDate), endDate: String(booking.endDate), rentalTotal, excess, excessKm: Number(booking.excessMileageKm) || 0, excessRate: Number(booking.excessMileageRatePerKm) || 0, deposit, depositStatus: typeof booking.depositStatus === "string" ? booking.depositStatus : undefined, paid });

    const result = await sendEmail({
      to: customerEmail,
      ...content,
      replyTo: details.email,
      category: "invoice",
      // Collapses accidental double sends within the same minute.
      idempotencyKey: `invoice-${booking.id}-${paid ? "paid" : "due"}-${Math.floor(Date.now() / 60_000)}`,
    });
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.reason === "network" ? 504 : 502 });
    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    console.error("Invoice email failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not send this invoice. Try again shortly." }, { status: 503 });
  }
}
