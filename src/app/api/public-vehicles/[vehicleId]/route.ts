import { NextResponse } from "next/server";
import { loadWorkspaceData } from "@/lib/workspace-db";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ vehicleId: string }> }) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Vehicle listings are temporarily unavailable." }, { status: 503 });
  try {
    const { vehicleId } = await params;
    const data = await loadWorkspaceData();
    const vehicle = (data.vehicles as Record<string, unknown>[]).find((item) => item.id === vehicleId);
    if (!vehicle || vehicle.status !== "Available") return NextResponse.json({ error: "This vehicle is not currently available." }, { status: 404 });
    return NextResponse.json({ vehicle: {
      id: vehicle.id, make: vehicle.make, model: vehicle.model, year: vehicle.year,
      vehicleType: vehicle.vehicleType, dailyRate: vehicle.dailyRate,
      depositAmount: vehicle.depositAmount, mileageAllowanceKmPerDay: vehicle.mileageAllowanceKmPerDay,
      excessMileageRatePerKm: vehicle.excessMileageRatePerKm, transmission: vehicle.transmission,
      fuelConsumptionLPer100Km: typeof vehicle.fuelConsumptionLPer100Km === "number" && Number.isFinite(vehicle.fuelConsumptionLPer100Km) ? vehicle.fuelConsumptionLPer100Km : null,
      imageDataUrl: typeof vehicle.imageDataUrl === "string" && vehicle.imageDataUrl.startsWith("data:image/jpeg;base64,") ? vehicle.imageDataUrl : null,
    } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Public vehicle read failed", error);
    return NextResponse.json({ error: "Could not load this vehicle." }, { status: 503 });
  }
}
