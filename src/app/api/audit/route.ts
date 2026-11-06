import { NextResponse } from "next/server";
import { canManageTeam, getWorkspaceSession } from "@/lib/workspace-auth";
import { listAuditEntries } from "@/lib/workspace-db";

export const runtime = "nodejs";

const ENTITIES = new Set(["vehicle", "customer", "booking", "maintenance", "inspection", "expense", "company", "account", "team"]);

/** Activity log for managers and the workspace owner. */
export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  const user = await getWorkspaceSession();
  if (!user) return NextResponse.json({ error: "Sign in to view activity." }, { status: 401 });
  if (!canManageTeam(user.role)) return NextResponse.json({ error: "Only managers can view the activity log." }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const before = params.get("before") ?? undefined;
  const entity = params.get("entity") ?? undefined;
  const userId = params.get("userId") ?? undefined;
  if (before && Number.isNaN(Date.parse(before))) return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  if (entity && !ENTITIES.has(entity)) return NextResponse.json({ error: "Unknown activity type." }, { status: 400 });
  try {
    const entries = await listAuditEntries({ before, entity, userId, limit: 100 });
    return NextResponse.json({ entries, hasMore: entries.length === 100 }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Activity log read failed", error);
    return NextResponse.json({ error: "Could not load the activity log." }, { status: 503 });
  }
}
