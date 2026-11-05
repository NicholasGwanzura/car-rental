import { NextResponse } from "next/server";
import { canInviteRole, canManageTeam, getWorkspaceSession } from "@/lib/workspace-auth";
import { createWorkspaceInvite, listWorkspaceTeam } from "@/lib/workspace-db";

export const runtime = "nodejs";

function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c); }

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
    if (!canInviteRole(inviter.role, body.role)) return NextResponse.json({ error: inviter.role === "manager" ? "Managers can invite sales staff only." : "You cannot invite that role." }, { status: 403 });
    const invite = await createWorkspaceInvite(body.email, body.role, inviter.id);
    const invitationUrl = new URL(`/invite/${invite.token}`, process.env.NEXT_PUBLIC_APP_URL || "https://classicrides.online").toString();
    let emailSent = false;
    if (process.env.RESEND_API_KEY) {
      const sender = process.env.RESEND_FROM_EMAIL || "Classic Rides <sales@classicrides.online>";
      const result = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: sender, to: [invite.email], subject: "Your Classic Rides workspace invitation", html: `<div style="font-family:'Honor Sans',Arial,sans-serif;color:#26372f"><p>You have been invited to join the Classic Rides workspace as a ${escapeHtml(invite.role)}.</p><p><a href="${escapeHtml(invitationUrl)}">Accept your invitation</a></p><p>This link expires in 7 days.</p></div>`, text: `You have been invited to join the Classic Rides workspace as a ${invite.role}. Accept your invitation: ${invitationUrl} (expires in 7 days).` }) });
      emailSent = result.ok;
    }
    return NextResponse.json({ ok: true, emailSent, invitationUrl, message: emailSent ? "Invitation email sent." : "Invitation created. Copy the link to share it; email delivery is not configured yet." }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create this invitation.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
