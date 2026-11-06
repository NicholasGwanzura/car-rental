import type { ReactNode } from "react";
import { DrilldownProvider } from "@/components/drilldown";
import { RentalDataProvider } from "@/lib/rental-data";

/**
 * One data store for the whole workspace. Pages inside this group share it, so moving
 * between Customers and Bookings never reloads stale data over a save that's still in flight.
 */
export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <RentalDataProvider><DrilldownProvider>{children}</DrilldownProvider></RentalDataProvider>;
}
