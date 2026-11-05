import { NextResponse } from "next/server";
import { hasWorkspaceSession } from "@/lib/workspace-auth";
import { listPublicPrebookingRequests, updatePublicPrebookingStatus, type PublicPrebookingRequest } from "@/lib/workspace-db";

export const runtime = "nodejs";
const statuses = ["New", "Contacted", "Accepted", "Declined"] as const;

export async function GET() {
  if (!await hasWorkspaceSession()) return NextResponse.json({ error: "Sign in to your workspace." }, { status: 401 });
  try { return NextResponse.json({ requests: await listPublicPrebookingRequests() }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Could not load pre-booking requests." }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  if (!await hasWorkspaceSession()) return NextResponse.json({ error: "Sign in to your workspace." }, { status: 401 });
  try {
    const body = await request.json() as { id?: unknown; status?: unknown };
    if (typeof body.id !== "string" || !statuses.includes(body.status as PublicPrebookingRequest["status"])) return NextResponse.json({ error: "Invalid request update." }, { status: 400 });
    const updated = await updatePublicPrebookingStatus(body.id, body.status as PublicPrebookingRequest["status"]);
    if (!updated) return NextResponse.json({ error: "Request not found." }, { status: 404 });
    return NextResponse.json({ request: updated });
  } catch { return NextResponse.json({ error: "Could not update request." }, { status: 503 }); }
}
