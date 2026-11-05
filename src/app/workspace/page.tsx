import { OverviewWorkspace } from "@/components/overview-workspace";
import { RentalDataProvider } from "@/lib/rental-data";

export default function WorkspacePage() {
  return <RentalDataProvider><OverviewWorkspace /></RentalDataProvider>;
}
