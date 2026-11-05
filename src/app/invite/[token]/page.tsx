import { InviteAcceptPage } from "@/components/invite-accept-page";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InviteAcceptPage token={token} />;
}
