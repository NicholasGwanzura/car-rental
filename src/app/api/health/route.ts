import { NextResponse } from "next/server";
import { checkWorkspaceDatabase } from "@/lib/workspace-db";

export const runtime = "nodejs";

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json({ status: "ok", database: "not-configured" });
  try {
    await checkWorkspaceDatabase();
    return NextResponse.json({ status: "ok", database: "connected" });
  } catch {
    return NextResponse.json({ status: "degraded", database: "unavailable" }, { status: 503 });
  }
}
