import { notFound } from "next/navigation";
import { requireClient } from "@/server/client/auth";
import { readProject } from "@/server/client/service";
import { ProjectWorkspace } from "@/components/workspace/project";
export default async function ClientProject({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; stage?: string }> }) {
  const client = await requireClient();
  const project = await readProject((await params).id, { id: client.id, side: "CLIENT" });
  if (!project) notFound();
  const query = await searchParams;
  return <ProjectWorkspace project={project} tab={query.tab} stageId={query.stage} />;
}
