import { NextResponse } from "next/server";
import { getWorkspaceUserCount } from "@/lib/workspace-db";

export const runtime = "nodejs";

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Workspace access is not configured." }, { status: 503 });
  try {
    const setupRequired = await getWorkspaceUserCount() === 0;
    return NextResponse.json({ setupRequired, email: process.env.SUPER_ADMIN_EMAIL || "nick@spiritusglobal.tech" }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Could not check workspace setup." }, { status: 503 }); }
}
