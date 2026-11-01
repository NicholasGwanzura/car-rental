CREATE TABLE IF NOT EXISTS "RentalWorkspaceState" (
  "id" TEXT PRIMARY KEY,
  "payload" JSONB NOT NULL DEFAULT '{"vehicles":[],"customers":[],"bookings":[],"maintenance":[]}'::jsonb,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
