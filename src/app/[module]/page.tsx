import { ModuleWorkspace } from "@/components/module-workspace";
import { RentalDataProvider } from "@/lib/rental-data";
import { canAccessModule, getWorkspaceSession } from "@/lib/workspace-auth";
import { redirect } from "next/navigation";

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const user = await getWorkspaceSession();
  if (!user || !canAccessModule(user.role, module)) redirect("/workspace");
  return <RentalDataProvider><ModuleWorkspace module={module} /></RentalDataProvider>;
}
