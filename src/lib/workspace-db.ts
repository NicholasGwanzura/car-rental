import { Pool } from "pg";

type WorkspaceData = { vehicles: unknown[]; customers: unknown[]; bookings: unknown[]; maintenance: unknown[] };
const EMPTY: WorkspaceData = { vehicles: [], customers: [], bookings: [], maintenance: [] };
const globalForPool = globalThis as typeof globalThis & { rentalWorkspacePool?: Pool; rentalWorkspaceSchema?: Promise<void> };

function pool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  globalForPool.rentalWorkspacePool ??= new Pool({ connectionString, max: 5, idleTimeoutMillis: 30_000 });
  return globalForPool.rentalWorkspacePool;
}

async function ensureTable() {
  globalForPool.rentalWorkspaceSchema ??= pool().query(`
    CREATE TABLE IF NOT EXISTS "RentalWorkspaceState" (
      "id" TEXT PRIMARY KEY,
      "payload" JSONB NOT NULL DEFAULT '{"vehicles":[],"customers":[],"bookings":[],"maintenance":[]}'::jsonb,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).then(() => undefined).catch((error) => {
    globalForPool.rentalWorkspaceSchema = undefined;
    throw error;
  });
  await globalForPool.rentalWorkspaceSchema;
}

function isWorkspaceData(value: unknown): value is WorkspaceData {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return ["vehicles", "customers", "bookings", "maintenance"].every((key) => Array.isArray(record[key]));
}

export async function loadWorkspaceData(): Promise<WorkspaceData> {
  await ensureTable();
  const database = pool();
  const result = await database.query<{ payload: unknown }>(`SELECT "payload" FROM "RentalWorkspaceState" WHERE "id" = $1`, ["default"]);
  if (result.rowCount === 0) {
    await database.query(`INSERT INTO "RentalWorkspaceState" ("id", "payload") VALUES ($1, $2::jsonb) ON CONFLICT ("id") DO NOTHING`, ["default", JSON.stringify(EMPTY)]);
    return EMPTY;
  }
  return isWorkspaceData(result.rows[0].payload) ? result.rows[0].payload : EMPTY;
}

export async function saveWorkspaceData(value: unknown) {
  if (!isWorkspaceData(value)) throw new Error("Workspace data must include vehicle, customer, booking, and maintenance arrays");
  await ensureTable();
  await pool().query(
    `INSERT INTO "RentalWorkspaceState" ("id", "payload", "updatedAt") VALUES ($1, $2::jsonb, NOW()) ON CONFLICT ("id") DO UPDATE SET "payload" = EXCLUDED."payload", "updatedAt" = NOW()`,
    ["default", JSON.stringify(value)],
  );
}

export async function checkWorkspaceDatabase() {
  await pool().query("SELECT 1");
  return true;
}
