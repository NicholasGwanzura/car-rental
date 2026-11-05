import { NextResponse } from "next/server";
import { bootstrapWorkspaceAdmin, createWorkspaceSession } from "@/lib/workspace-db";
import { WORKSPACE_COOKIE, workspaceCookieOptions } from "@/lib/workspace-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Workspace access is not configured." }, { status: 503 });
  try {
    const body = await request.json() as { email?: unknown; name?: unknown; password?: unknown };
    if (typeof body.email !== "string" || typeof body.name !== "string" || typeof body.password !== "string") return NextResponse.json({ error: "Enter your name, email, and password." }, { status: 400 });
    const user = await bootstrapWorkspaceAdmin(body.email, body.name, body.password);
    if (!user) return NextResponse.json({ error: "The first workspace administrator has already been created. Sign in instead." }, { status: 409 });
    const token = await createWorkspaceSession(user.id);
    const response = NextResponse.json({ ok: true, user });
    response.cookies.set(WORKSPACE_COOKIE, token, workspaceCookieOptions);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create the workspace administrator.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
