import { NextResponse } from "next/server";
import { revokeWorkspaceSession } from "@/lib/workspace-db";
import { WORKSPACE_COOKIE } from "@/lib/workspace-auth";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(WORKSPACE_COOKIE)?.value;
  if (sessionToken) await revokeWorkspaceSession(sessionToken).catch(() => undefined);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(WORKSPACE_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
