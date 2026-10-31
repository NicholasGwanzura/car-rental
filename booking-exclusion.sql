-- Apply after Prisma migrations; Prisma schema cannot express exclusion constraints.
CREATE EXTENSION IF NOT EXISTS btree_gist;
-- Only bookings with a specifically assigned vehicle are constrained here.
-- Additional safeguards are required for maintenance blackout periods and rentals.
ALTER TABLE "Booking" ADD CONSTRAINT booking_valid_interval CHECK ("endsAt" > "startsAt");
ALTER TABLE "Booking" ADD CONSTRAINT booking_vehicle_no_overlap
EXCLUDE USING gist (
  "vehicleId" WITH =,
  tstzrange("startsAt", "endsAt", '[)') WITH &&
) WHERE ("vehicleId" IS NOT NULL AND "status" IN ('HELD','CONFIRMED'));
