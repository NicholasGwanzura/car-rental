import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const WORKSPACE_COOKIE = "spiritus_workspace_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function configuredPassword() {
  return process.env.WORKSPACE_PASSWORD;
}

function sign(value: string, password: string) {
  return createHmac("sha256", password).update(value).digest("base64url");
}

export function passwordMatches(candidate: unknown) {
  const password = configuredPassword();
  if (!password || typeof candidate !== "string") return false;
  const expected = Buffer.from(password);
  const actual = Buffer.from(candidate);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createWorkspaceToken() {
  const password = configuredPassword();
  if (!password) throw new Error("WORKSPACE_PASSWORD is not configured");
  const expiresAt = String(Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS);
  return `${expiresAt}.${sign(expiresAt, password)}`;
}

export async function hasWorkspaceSession() {
  const password = configuredPassword();
  if (!password) return false;
  const token = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  if (!token) return false;
  const [expiresAt, signature, extra] = token.split(".");
  if (!expiresAt || !signature || extra || Number(expiresAt) <= Math.floor(Date.now() / 1000)) return false;
  const expected = Buffer.from(sign(expiresAt, password));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export const workspaceCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
