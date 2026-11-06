import { NextResponse } from "next/server";
import { createPublicPrebookingRequest, loadWorkspaceData } from "@/lib/workspace-db";
import { brandedCompany } from "@/lib/brand";
import { emailConfigured, sendEmail } from "@/lib/email";
import { prebookingAlertEmail } from "@/lib/email-templates";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ vehicleId: string }> }) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Pre-booking is temporarily unavailable." }, { status: 503 });
  try {
    const { vehicleId } = await params;
    const body = await request.json() as Record<string, unknown>;
    const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    if (customerName.length < 2 || phone.length < 5) {
      return NextResponse.json({ error: "Enter your name and phone number." }, { status: 400 });
    }
    const data = await loadWorkspaceData();
    const vehicle = (data.vehicles as Record<string, unknown>[]).find((item) => item.id === vehicleId);
    if (!vehicle || vehicle.status !== "Available") return NextResponse.json({ error: "This vehicle is not currently available." }, { status: 404 });
    const prebooking = await createPublicPrebookingRequest({ vehicleId, customerName, phone });
    const reference = prebooking.id.slice(0, 8).toUpperCase();
    // Alert the Classic Rides inbox (a fixed address, never the visitor's). A failed alert doesn't fail the request.
    if (emailConfigured()) {
      const company = (data as { company?: Record<string, string> }).company;
      const content = prebookingAlertEmail({
        company, reference,
        vehicleName: `${vehicle.year ?? ""} ${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim(),
        registration: typeof vehicle.registration === "string" ? vehicle.registration : undefined,
        customerName, phone,
        workspaceUrl: new URL("/bookings", process.env.NEXT_PUBLIC_APP_URL || "https://classicrides.online").toString(),
      });
      await sendEmail({ to: brandedCompany(company).emails, ...content, category: "prebooking_alert", idempotencyKey: `prebooking-${prebooking.id}` });
    }
    return NextResponse.json({ ok: true, reference }, { status: 201 });
  } catch (error) {
    console.error("Public pre-booking failed", error);
    return NextResponse.json({ error: "Could not send the pre-booking request. Please try again." }, { status: 503 });
  }
}
