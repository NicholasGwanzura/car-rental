import { cookies } from "next/headers";
import { getWorkspaceUserForSession, type WorkspaceRole, type WorkspaceUserSummary } from "@/lib/workspace-db";

export const WORKSPACE_COOKIE = "classic_rides_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export async function getWorkspaceSession(): Promise<WorkspaceUserSummary | null> {
  const token = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  if (!token || !process.env.DATABASE_URL) return null;
  try { return await getWorkspaceUserForSession(token); }
  catch { return null; }
}

export async function hasWorkspaceSession() {
  return Boolean(await getWorkspaceSession());
}

export function canAccessModule(role: WorkspaceRole, module: string) {
  if (role === "super_admin") return true;
  if (role === "manager") return module !== "settings";
  return ["workspace", "bookings", "fleet", "customers", "inspections", "billing"].includes(module);
}

export function canManageTeam(role: WorkspaceRole) {
  return role === "super_admin" || role === "manager";
}

export function canInviteRole(role: WorkspaceRole, invitedRole: string) {
  return role === "super_admin" ? invitedRole === "manager" || invitedRole === "sales" : role === "manager" && invitedRole === "sales";
}

export const workspaceCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
