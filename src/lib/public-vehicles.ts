import { loadWorkspaceData } from "@/lib/workspace-db";

export type PublicVehicleSummary = {
  id: string;
  make: string;
  model: string;
  year: number;
  vehicleType: string;
  dailyRate: number;
  transmission: string;
  mileageAllowanceKmPerDay: number;
  fuelConsumptionLPer100Km: number | null;
  hasImage: boolean;
};

const JPEG_PREFIX = "data:image/jpeg;base64,";

function finite(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : null; }

/** Vehicles marked Available in the workspace, safe to show on the public site. Empty when the database is unavailable. */
export async function listPublicVehicles(): Promise<PublicVehicleSummary[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const data = await loadWorkspaceData();
    return (data.vehicles as Record<string, unknown>[])
      .filter((vehicle) => vehicle.status === "Available" && typeof vehicle.id === "string")
      .map((vehicle) => ({
        id: String(vehicle.id),
        make: String(vehicle.make ?? ""),
        model: String(vehicle.model ?? ""),
        year: finite(vehicle.year) ?? 0,
        vehicleType: String(vehicle.vehicleType ?? "Budget"),
        dailyRate: finite(vehicle.dailyRate) ?? 0,
        transmission: String(vehicle.transmission ?? ""),
        mileageAllowanceKmPerDay: finite(vehicle.mileageAllowanceKmPerDay) ?? 0,
        fuelConsumptionLPer100Km: finite(vehicle.fuelConsumptionLPer100Km),
        hasImage: typeof vehicle.imageDataUrl === "string" && vehicle.imageDataUrl.startsWith(JPEG_PREFIX),
      }))
      .sort((a, b) => a.dailyRate - b.dailyRate);
  } catch (error) {
    console.error("Public vehicle list failed", error);
    return [];
  }
}

/** The stored JPEG photo of an available vehicle, or null. */
export async function loadPublicVehicleImage(vehicleId: string): Promise<Buffer | null> {
  if (!process.env.DATABASE_URL) return null;
  const data = await loadWorkspaceData();
  const vehicle = (data.vehicles as Record<string, unknown>[]).find((item) => item.id === vehicleId);
  if (!vehicle || vehicle.status !== "Available" || typeof vehicle.imageDataUrl !== "string" || !vehicle.imageDataUrl.startsWith(JPEG_PREFIX)) return null;
  return Buffer.from(vehicle.imageDataUrl.slice(JPEG_PREFIX.length), "base64");
}
