import { ModuleWorkspace } from "@/components/module-workspace";

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  return <ModuleWorkspace module={module} />;
}
