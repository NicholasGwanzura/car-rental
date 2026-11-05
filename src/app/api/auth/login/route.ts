import { NextResponse } from "next/server";
import { authenticateWorkspaceUser, createWorkspaceSession } from "@/lib/workspace-db";
import { WORKSPACE_COOKIE, workspaceCookieOptions } from "@/lib/workspace-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Workspace access is not configured yet." }, { status: 503 });
  let body: { email?: unknown; password?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter your email and password." }, { status: 400 }); }
  if (typeof body.email !== "string" || typeof body.password !== "string") return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  try {
    const user = await authenticateWorkspaceUser(body.email, body.password);
    if (!user) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    const token = await createWorkspaceSession(user.id);
    const response = NextResponse.json({ ok: true, user });
    response.cookies.set(WORKSPACE_COOKIE, token, workspaceCookieOptions);
    return response;
  } catch (error) {
    console.error("Workspace login failed", error);
    return NextResponse.json({ error: "Could not sign in right now." }, { status: 503 });
  }
}
