import { NextResponse } from "next/server";
import { getWorkspaceSession } from "@/lib/workspace-auth";
import { loadWorkspaceData, saveWorkspaceData } from "@/lib/workspace-db";

export const runtime = "nodejs";

function recordIds(value: unknown) {
  return new Set(Array.isArray(value) ? value.map((item) => (item && typeof item === "object" ? (item as { id?: unknown }).id : undefined)).filter((id): id is string => typeof id === "string") : []);
}

function removesRecords(current: Record<string, unknown>, next: Record<string, unknown>) {
  return ["vehicles", "customers", "bookings"].some((key) => {
    const kept = recordIds(next[key]);
    return [...recordIds(current[key])].some((id) => !kept.has(id));
  });
}

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  const user = await getWorkspaceSession();
  if (!user) return NextResponse.json({ error: "Sign in to your rental workspace." }, { status: 401 });
  try { return NextResponse.json({ data: await loadWorkspaceData(), user }); }
  catch (error) {
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
  try {
    if (user.role !== "super_admin" && body && typeof body === "object" && !Array.isArray(body)) {
      const current = await loadWorkspaceData();
      if (user.role === "sales" && removesRecords(current as Record<string, unknown>, body as Record<string, unknown>)) {
        return NextResponse.json({ error: "Only managers can delete vehicles, customers, or bookings." }, { status: 403 });
      }
      body = { ...(body as Record<string, unknown>), company: (current as Record<string, unknown>).company };
    }
    await saveWorkspaceData(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Workspace database write failed", error);
    return NextResponse.json({ error: "Could not save workspace data." }, { status: 400 });
  }
}
