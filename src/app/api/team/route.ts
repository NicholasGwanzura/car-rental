import { NextResponse } from "next/server";
import { canInviteRole, canManageTeam, getWorkspaceSession } from "@/lib/workspace-auth";
import { createWorkspaceInvite, listWorkspaceTeam, loadWorkspaceData, recordAuditEntries } from "@/lib/workspace-db";
import { emailConfigured, sendEmail } from "@/lib/email";
import { inviteEmail } from "@/lib/email-templates";

export const runtime = "nodejs";

const USER_MESSAGES = ["A workspace account or active invitation already uses this email."];

export async function GET() {
  const user = await getWorkspaceSession();
  if (!user) return NextResponse.json({ error: "Sign in to manage workspace access." }, { status: 401 });
  if (!canManageTeam(user.role)) return NextResponse.json({ error: "You don’t have access to the team directory." }, { status: 403 });
  try { return NextResponse.json(await listWorkspaceTeam(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Could not load the team directory." }, { status: 503 }); }
}

export async function POST(request: Request) {
  const inviter = await getWorkspaceSession();
  if (!inviter) return NextResponse.json({ error: "Sign in to invite a teammate." }, { status: 401 });
  try {
    const body = await request.json() as { email?: unknown; role?: unknown };
    if (typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) || (body.role !== "manager" && body.role !== "sales")) return NextResponse.json({ error: "Enter a valid email and select a role." }, { status: 400 });
    if (!canInviteRole(inviter.role, body.role)) return NextResponse.json({ error: "You cannot invite that role." }, { status: 403 });
    const invite = await createWorkspaceInvite(body.email, body.role, inviter.id);
    const invitationUrl = new URL(`/invite/${invite.token}`, process.env.NEXT_PUBLIC_APP_URL || "https://classicrides.online").toString();
    const company = await loadWorkspaceData().then((data) => (data as { company?: Record<string, string> }).company).catch(() => undefined);
    const content = inviteEmail({ company, inviterName: inviter.name, role: invite.role, invitationUrl, expiresAt: invite.expiresAt });
    const delivery = emailConfigured()
      ? await sendEmail({ to: invite.email, ...content, replyTo: inviter.email, category: "invite", idempotencyKey: `invite-${invite.id}` })
      : null;
    const emailSent = delivery?.ok === true;
    const message = emailSent
      ? `Invitation email sent to ${invite.email}.`
      : delivery
        ? `Invitation created, but the email couldn’t be sent: ${delivery.message} Copy the link below to share it.`
        : "Invitation created. Email delivery isn’t set up yet, so copy the link below to share it.";
    await recordAuditEntries(inviter, [{ entity: "team", entityId: invite.id, action: "invited", summary: `Invited ${invite.email} as ${invite.role === "manager" ? "a manager" : "sales staff"}${emailSent ? "" : " (link shared manually)"}` }]);
    return NextResponse.json({ ok: true, emailSent, invitationUrl, message }, { status: 201 });
  } catch (error) {
    // Only pass on the messages written for people; anything else (e.g. a database error) stays in the logs.
    const message = error instanceof Error && USER_MESSAGES.some((known) => error.message.startsWith(known)) ? error.message : "Could not create this invitation. Try again shortly.";
    if (message !== (error instanceof Error ? error.message : "")) console.error("Team invitation failed", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
