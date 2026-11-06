import { loadPublicVehicleImage } from "@/lib/public-vehicles";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ vehicleId: string }> }) {
  try {
    const { vehicleId } = await params;
    const image = await loadPublicVehicleImage(vehicleId);
    if (!image) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(image), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } });
  } catch (error) {
    console.error("Public vehicle image read failed", error);
    return new Response("Unavailable", { status: 503 });
  }
}
