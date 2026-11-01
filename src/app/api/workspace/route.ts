import { NextResponse } from "next/server";
import { hasWorkspaceSession } from "@/lib/workspace-auth";
import { loadWorkspaceData, saveWorkspaceData } from "@/lib/workspace-db";

export const runtime = "nodejs";

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  if (!await hasWorkspaceSession()) return NextResponse.json({ error: "Sign in to your rental workspace." }, { status: 401 });
  try { return NextResponse.json({ data: await loadWorkspaceData() }); }
  catch (error) {
    console.error("Workspace database read failed", error);
    return NextResponse.json({ error: "Could not load workspace data." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  if (!await hasWorkspaceSession()) return NextResponse.json({ error: "Sign in to your rental workspace." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid workspace data." }, { status: 400 }); }
  try {
    await saveWorkspaceData(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Workspace database write failed", error);
    return NextResponse.json({ error: "Could not save workspace data." }, { status: 400 });
  }
}
