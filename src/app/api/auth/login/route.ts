import { NextRequest, NextResponse } from "next/server";
import { createWorkspaceToken, passwordMatches, WORKSPACE_COOKIE, workspaceCookieOptions } from "@/lib/workspace-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL || !process.env.WORKSPACE_PASSWORD) {
    return NextResponse.json({ error: "Workspace access is not configured yet." }, { status: 503 });
  }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter your workspace password." }, { status: 400 }); }
  if (!passwordMatches((body as { password?: unknown })?.password)) {
    return NextResponse.json({ error: "That password doesn’t match." }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(WORKSPACE_COOKIE, createWorkspaceToken(), workspaceCookieOptions);
  return response;
}
