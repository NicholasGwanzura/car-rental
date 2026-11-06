import type { Booking, PrebookingInspection } from "@/lib/rental-data";

/**
 * Mileage analysis for the fleet: how far each vehicle has been driven on
 * rental bookings, and how far it moved while it wasn't booked (the gap
 * between the last recorded reading and the next booking's pickup reading).
 */

export type VehicleMileage = {
  /** Distance covered on rentals: return reading minus pickup reading, per booking. */
  bookedKm: number;
  /** Distance covered between records while the vehicle wasn't on a booking. */
  unbookedKm: number;
  /** The highest recorded odometer reading for the vehicle. */
  lastOdometerKm: number;
  /** Completed rentals that have both a pickup and a return reading. */
  trips: number;
};

/** Highest reading recorded for a vehicle before the booking's pickup; null when there is no earlier reading. */
export function unbookedBeforeBooking(booking: Booking, bookings: Booking[], inspections: PrebookingInspection[]): number | null {
  const checkout = booking.checkoutOdometer;
  if (checkout === undefined) return null;
  let previous: number | null = null;
  for (const other of bookings) {
    if (other.vehicleId !== booking.vehicleId || other.id === booking.id) continue;
    for (const km of [other.checkoutOdometer, other.returnOdometer]) {
      if (km !== undefined && km < checkout && (previous === null || km > previous)) previous = km;
    }
  }
  for (const inspection of inspections) {
    if (inspection.vehicleId === booking.vehicleId && inspection.odometerKm < checkout && (previous === null || inspection.odometerKm > previous)) previous = inspection.odometerKm;
  }
  return previous === null ? null : Math.max(0, checkout - previous);
}

/** Booked and unbooked distance for one vehicle, worked out from every recorded reading. */
export function vehicleMileage(vehicleId: string, bookings: Booking[], inspections: PrebookingInspection[]): VehicleMileage {
  const readings: { km: number; checkout: boolean }[] = [];
  let bookedKm = 0;
  let trips = 0;
  for (const booking of bookings) {
    if (booking.vehicleId !== vehicleId) continue;
    if (booking.checkoutOdometer !== undefined) readings.push({ km: booking.checkoutOdometer, checkout: true });
    if (booking.returnOdometer !== undefined) readings.push({ km: booking.returnOdometer, checkout: false });
    if (booking.checkoutOdometer !== undefined && booking.returnOdometer !== undefined) {
      bookedKm += Math.max(0, booking.returnOdometer - booking.checkoutOdometer);
      if (booking.status === "Completed") trips += 1;
    }
  }
  for (const inspection of inspections) {
    if (inspection.vehicleId === vehicleId) readings.push({ km: inspection.odometerKm, checkout: false });
  }
  // Odometer readings only ever go up, so ordering by value reconstructs their order in time.
  readings.sort((a, b) => a.km - b.km);
  let last: number | null = null;
  let unbookedKm = 0;
  for (const reading of readings) {
    if (reading.checkout && last !== null && reading.km > last) unbookedKm += reading.km - last;
    if (last === null || reading.km > last) last = reading.km;
  }
  return { bookedKm, unbookedKm, lastOdometerKm: last ?? 0, trips };
}
