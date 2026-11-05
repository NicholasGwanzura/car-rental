import { NextResponse } from "next/server";
import { createPublicPrebookingRequest, loadWorkspaceData } from "@/lib/workspace-db";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ vehicleId: string }> }) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Pre-booking is temporarily unavailable." }, { status: 503 });
  try {
    const { vehicleId } = await params;
    const body = await request.json() as Record<string, unknown>;
    const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const driverLicence = typeof body.driverLicence === "string" ? body.driverLicence.trim() : "";
    const startDate = typeof body.startDate === "string" ? body.startDate : "";
    const endDate = typeof body.endDate === "string" ? body.endDate : "";
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 1000) : "";
    if (customerName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length < 5 || driverLicence.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate <= startDate) {
      return NextResponse.json({ error: "Enter your name, email, phone, licence number, and valid rental dates." }, { status: 400 });
    }
    const data = await loadWorkspaceData();
    const vehicle = (data.vehicles as Record<string, unknown>[]).find((item) => item.id === vehicleId);
    if (!vehicle || vehicle.status !== "Available") return NextResponse.json({ error: "This vehicle is not currently available." }, { status: 404 });
    const overlaps = (data.bookings as Record<string, unknown>[]).some((booking) => booking.vehicleId === vehicleId && ["Confirmed", "Active"].includes(String(booking.status)) && startDate < String(booking.endDate) && endDate > String(booking.startDate));
    if (overlaps) return NextResponse.json({ error: "Those dates are no longer available. Choose another date range or contact Classic Rides." }, { status: 409 });
    const prebooking = await createPublicPrebookingRequest({ vehicleId, customerName, email, phone, driverLicence, startDate, endDate, message });
    return NextResponse.json({ ok: true, reference: prebooking.id.slice(0, 8).toUpperCase() }, { status: 201 });
  } catch (error) {
    console.error("Public pre-booking failed", error);
    return NextResponse.json({ error: "Could not send the pre-booking request. Please try again." }, { status: 503 });
  }
}
