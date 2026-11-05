import type { Metadata } from "next";
import { PublicVehiclePage } from "@/components/public-vehicle-page";

export const metadata: Metadata = { title: "Pre-book a vehicle", description: "View a Classic Rides vehicle and send a pre-booking request." };

export default async function RentVehiclePage({ params }: { params: Promise<{ vehicleId: string }> }) {
  const { vehicleId } = await params;
  return <PublicVehiclePage vehicleId={vehicleId} />;
}
