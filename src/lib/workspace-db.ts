import { Pool } from "pg";
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

type WorkspaceData = { vehicles: unknown[]; customers: unknown[]; bookings: unknown[]; maintenance: unknown[]; inspections?: unknown[]; expenses?: unknown[] };
const EMPTY: WorkspaceData = { vehicles: [], customers: [], bookings: [], maintenance: [], inspections: [] };
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
  `).then(async () => {
    await pool().query(`CREATE TABLE IF NOT EXISTS "RentalPrebookingRequest" ("id" TEXT PRIMARY KEY, "vehicleId" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'New', "payload" JSONB NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool().query(`CREATE TABLE IF NOT EXISTS "WorkspaceUser" ("id" TEXT PRIMARY KEY, "email" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL, "passwordHash" TEXT NOT NULL, "role" TEXT NOT NULL CHECK ("role" IN ('super_admin','manager','sales')), "active" BOOLEAN NOT NULL DEFAULT TRUE, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool().query(`CREATE TABLE IF NOT EXISTS "WorkspaceSession" ("tokenHash" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "WorkspaceUser"("id") ON DELETE CASCADE, "expiresAt" TIMESTAMPTZ NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool().query(`CREATE TABLE IF NOT EXISTS "WorkspaceInvite" ("id" TEXT PRIMARY KEY, "tokenHash" TEXT NOT NULL UNIQUE, "email" TEXT NOT NULL, "role" TEXT NOT NULL CHECK ("role" IN ('manager','sales')), "invitedBy" TEXT NOT NULL REFERENCES "WorkspaceUser"("id"), "expiresAt" TIMESTAMPTZ NOT NULL, "acceptedAt" TIMESTAMPTZ, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  }).catch((error) => {
    globalForPool.rentalWorkspaceSchema = undefined;
    throw error;
  });
  await globalForPool.rentalWorkspaceSchema;
}

function isWorkspaceData(value: unknown): value is WorkspaceData {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return ["vehicles", "customers", "bookings", "maintenance"].every((key) => Array.isArray(record[key]))
    && (record.inspections === undefined || Array.isArray(record.inspections))
    && (record.expenses === undefined || Array.isArray(record.expenses));
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

export type WorkspaceRole = "super_admin" | "manager" | "sales";
export type WorkspaceUserSummary = { id: string; email: string; name: string; role: WorkspaceRole };
const SESSION_DAYS = 7;
function hashToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
function makePasswordHash(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("base64url")}.${hash.toString("base64url")}`;
}
function verifyPasswordHash(password: string, encoded: string) {
  const [saltText, hashText] = encoded.split(".");
  if (!saltText || !hashText) return false;
  const expected = Buffer.from(hashText, "base64url");
  const actual = scryptSync(password, Buffer.from(saltText, "base64url"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
function userSummary(row: { id: string; email: string; name: string; role: WorkspaceRole }): WorkspaceUserSummary {
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

export async function getWorkspaceUserCount() {
  await ensureTable();
  const result = await pool().query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM "WorkspaceUser"`);
  return Number(result.rows[0]?.count ?? 0);
}

export async function bootstrapWorkspaceAdmin(emailInput: string, nameInput: string, password: string) {
  await ensureTable();
  const email = emailInput.trim().toLowerCase();
  const allowedEmail = (process.env.SUPER_ADMIN_EMAIL || "nick@spiritusglobal.tech").trim().toLowerCase();
  if (email !== allowedEmail) throw new Error("Bootstrap must use the configured super-admin email.");
  if (password.length < 12) throw new Error("Choose a password with at least 12 characters.");
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const count = await client.query(`SELECT 1 FROM "WorkspaceUser" LIMIT 1`);
    if (count.rowCount) { await client.query("ROLLBACK"); return null; }
    const id = randomUUID();
    const result = await client.query<{ id: string; email: string; name: string; role: WorkspaceRole }>(`INSERT INTO "WorkspaceUser" ("id","email","name","passwordHash","role") VALUES ($1,$2,$3,$4,'super_admin') RETURNING "id","email","name","role"`, [id, email, nameInput.trim() || "Nick Gwanzura", makePasswordHash(password)]);
    await client.query("COMMIT");
    return userSummary(result.rows[0]);
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function authenticateWorkspaceUser(emailInput: string, password: string) {
  await ensureTable();
  const result = await pool().query<{ id: string; email: string; name: string; role: WorkspaceRole; passwordHash: string }>(`SELECT "id","email","name","role","passwordHash" FROM "WorkspaceUser" WHERE "email" = $1 AND "active" = TRUE`, [emailInput.trim().toLowerCase()]);
  const row = result.rows[0];
  return row && verifyPasswordHash(password, row.passwordHash) ? userSummary(row) : null;
}

export async function createWorkspaceSession(userId: string) {
  await ensureTable();
  const token = randomBytes(32).toString("base64url");
  await pool().query(`INSERT INTO "WorkspaceSession" ("tokenHash","userId","expiresAt") VALUES ($1,$2,NOW() + INTERVAL '${SESSION_DAYS} days')`, [hashToken(token), userId]);
  return token;
}

export async function getWorkspaceUserForSession(token: string) {
  if (!token) return null;
  await ensureTable();
  const result = await pool().query<{ id: string; email: string; name: string; role: WorkspaceRole }>(`SELECT u."id",u."email",u."name",u."role" FROM "WorkspaceSession" s JOIN "WorkspaceUser" u ON u."id" = s."userId" WHERE s."tokenHash" = $1 AND s."expiresAt" > NOW() AND u."active" = TRUE`, [hashToken(token)]);
  return result.rows[0] ? userSummary(result.rows[0]) : null;
}

export async function revokeWorkspaceSession(token: string) {
  if (!token) return;
  await ensureTable();
  await pool().query(`DELETE FROM "WorkspaceSession" WHERE "tokenHash" = $1`, [hashToken(token)]);
}

export type WorkspaceInviteRole = "manager" | "sales";
export async function createWorkspaceInvite(emailInput: string, role: WorkspaceInviteRole, inviterId: string) {
  await ensureTable();
  const email = emailInput.trim().toLowerCase();
  const existing = await pool().query(`SELECT 1 FROM "WorkspaceUser" WHERE "email" = $1 UNION SELECT 1 FROM "WorkspaceInvite" WHERE "email" = $1 AND "acceptedAt" IS NULL AND "expiresAt" > NOW() LIMIT 1`, [email]);
  if (existing.rowCount) throw new Error("A workspace account or active invitation already uses this email.");
  const token = randomBytes(32).toString("base64url");
  const id = randomUUID();
  await pool().query(`INSERT INTO "WorkspaceInvite" ("id","tokenHash","email","role","invitedBy","expiresAt") VALUES ($1,$2,$3,$4,$5,NOW() + INTERVAL '7 days')`, [id, hashToken(token), email, role, inviterId]);
  return { id, token, email, role, expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString() };
}

export async function acceptWorkspaceInvite(token: string, nameInput: string, password: string) {
  await ensureTable();
  if (password.length < 12) throw new Error("Choose a password with at least 12 characters.");
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const invitation = await client.query<{ id: string; email: string; role: WorkspaceInviteRole }>(`SELECT "id","email","role" FROM "WorkspaceInvite" WHERE "tokenHash" = $1 AND "acceptedAt" IS NULL AND "expiresAt" > NOW() FOR UPDATE`, [hashToken(token)]);
    const invite = invitation.rows[0];
    if (!invite) { await client.query("ROLLBACK"); return null; }
    const id = randomUUID();
    const created = await client.query<{ id: string; email: string; name: string; role: WorkspaceRole }>(`INSERT INTO "WorkspaceUser" ("id","email","name","passwordHash","role") VALUES ($1,$2,$3,$4,$5) RETURNING "id","email","name","role"`, [id, invite.email, nameInput.trim(), makePasswordHash(password), invite.role]);
    await client.query(`UPDATE "WorkspaceInvite" SET "acceptedAt" = NOW() WHERE "id" = $1`, [invite.id]);
    await client.query("COMMIT");
    return userSummary(created.rows[0]);
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function listWorkspaceTeam() {
  await ensureTable();
  const [users, invites] = await Promise.all([
    pool().query(`SELECT "id","email","name","role","active","createdAt" FROM "WorkspaceUser" ORDER BY "createdAt"`),
    pool().query(`SELECT "id","email","role","expiresAt","createdAt" FROM "WorkspaceInvite" WHERE "acceptedAt" IS NULL AND "expiresAt" > NOW() ORDER BY "createdAt" DESC`),
  ]);
  return { users: users.rows, invites: invites.rows };
}

export type PublicPrebookingRequest = {
  id: string; vehicleId: string; customerName: string; email: string; phone: string;
  driverLicence: string; startDate: string; endDate: string; message: string;
  status: "New" | "Contacted" | "Accepted" | "Declined"; createdAt: string;
};

export async function createPublicPrebookingRequest(input: Omit<PublicPrebookingRequest, "id" | "status" | "createdAt">) {
  await ensureTable();
  const request: PublicPrebookingRequest = { ...input, id: randomUUID(), status: "New", createdAt: new Date().toISOString() };
  await pool().query(`INSERT INTO "RentalPrebookingRequest" ("id", "vehicleId", "status", "payload", "createdAt") VALUES ($1, $2, $3, $4::jsonb, NOW())`, [request.id, request.vehicleId, request.status, JSON.stringify(request)]);
  return request;
}

export async function listPublicPrebookingRequests() {
  await ensureTable();
  const result = await pool().query<{ payload: PublicPrebookingRequest }>(`SELECT "payload" FROM "RentalPrebookingRequest" ORDER BY "createdAt" DESC`);
  return result.rows.map((row) => row.payload);
}

export async function updatePublicPrebookingStatus(id: string, status: PublicPrebookingRequest["status"]) {
  await ensureTable();
  const result = await pool().query<{ payload: PublicPrebookingRequest }>(`UPDATE "RentalPrebookingRequest" SET "status" = $2, "payload" = jsonb_set("payload", '{status}', to_jsonb($2::text)) WHERE "id" = $1 RETURNING "payload"`, [id, status]);
  return result.rows[0]?.payload ?? null;
}
