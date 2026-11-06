import { OverviewWorkspace } from "@/components/overview-workspace";
import { RentalDataProvider } from "@/lib/rental-data";
import { DrilldownProvider } from "@/components/drilldown";

export default function WorkspacePage() {
  return <RentalDataProvider><DrilldownProvider><OverviewWorkspace /></DrilldownProvider></RentalDataProvider>;
}
