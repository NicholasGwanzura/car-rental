import { ClassicRidesHome } from "@/components/classic-rides-home";
import { listPublicVehicles } from "@/lib/public-vehicles";

// Rendered per request so newly added or unavailable vehicles show immediately.
export const dynamic = "force-dynamic";

export default async function Home() {
  return <ClassicRidesHome vehicles={await listPublicVehicles()} />;
}
