import { NextResponse } from "next/server";
import { acceptWorkspaceInvite, createWorkspaceSession } from "@/lib/workspace-db";
import { WORKSPACE_COOKIE, workspaceCookieOptions } from "@/lib/workspace-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Workspace access is not configured." }, { status: 503 });
  try {
    const body = await request.json() as { token?: unknown; name?: unknown; password?: unknown };
    if (typeof body.token !== "string" || typeof body.name !== "string" || typeof body.password !== "string" || body.name.trim().length < 2) return NextResponse.json({ error: "Enter your name and choose a password." }, { status: 400 });
    const user = await acceptWorkspaceInvite(body.token, body.name, body.password);
    if (!user) return NextResponse.json({ error: "This invitation has expired or was already used." }, { status: 410 });
    const session = await createWorkspaceSession(user.id);
    const response = NextResponse.json({ ok: true, user });
    response.cookies.set(WORKSPACE_COOKIE, session, workspaceCookieOptions);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not accept this invitation." }, { status: 400 });
  }
}
