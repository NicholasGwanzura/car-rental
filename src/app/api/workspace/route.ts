import { NextResponse } from "next/server";
import { getWorkspaceSession } from "@/lib/workspace-auth";
import { loadWorkspaceData, updateWorkspaceData } from "@/lib/workspace-db";
import { hasDeletions, mergeWorkspace, parseDeleted } from "@/lib/workspace-merge";

export const runtime = "nodejs";

class ForbiddenChange extends Error {}

/** Business expenses are only visible to managers and super admins. */
function visibleTo(role: string, data: Record<string, unknown>) {
  return role === "sales" ? { ...data, expenses: [] } : data;
}

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  const user = await getWorkspaceSession();
  if (!user) return NextResponse.json({ error: "Sign in to your rental workspace." }, { status: 401 });
  try {
    const data = await loadWorkspaceData();
    return NextResponse.json({ data: visibleTo(user.role, data as Record<string, unknown>), user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Workspace database read failed", error);
    return NextResponse.json({ error: "Could not load workspace data." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  const user = await getWorkspaceSession();
  if (!user) return NextResponse.json({ error: "Sign in to your rental workspace." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid workspace data." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid workspace data." }, { status: 400 });
  const incoming = body as Record<string, unknown>;
  const deleted = parseDeleted(incoming._deleted);
  try {
    const saved = await updateWorkspaceData((current) => {
      const stored = current as Record<string, unknown>;
      if (user.role === "sales" && hasDeletions(deleted, ["vehicles", "customers", "bookings"])) throw new ForbiddenChange("Only managers can delete vehicles, customers, or bookings.");
      // Merge by record so a stale tab or another device can't wipe records it hasn't loaded.
      const next = mergeWorkspace(stored, incoming, deleted);
      if (user.role !== "super_admin") next.company = stored.company;
      // Sales staff can't see or change business expenses; keep what is stored.
      if (user.role === "sales") next.expenses = stored.expenses ?? [];
      return next;
    });
    return NextResponse.json({ ok: true, data: visibleTo(user.role, saved as Record<string, unknown>) });
  } catch (error) {
    if (error instanceof ForbiddenChange) return NextResponse.json({ error: error.message }, { status: 403 });
    console.error("Workspace database write failed", error);
    return NextResponse.json({ error: "Could not save workspace data." }, { status: 400 });
  }
}
