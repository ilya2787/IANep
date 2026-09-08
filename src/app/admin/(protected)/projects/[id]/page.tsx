import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/admin-auth";
import { readProject } from "@/server/client/service";
import { ProjectWorkspace } from "@/components/workspace/project";
import s from "@/components/workspace/workspace.module.css";
import { getSystemSettings } from "@/server/system/settings";
export default async function AdminProject({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; stage?: string }> }) {
  const admin = await requireAdmin();
  const project = await readProject((await params).id, { id: admin.adminId, side: "ADMIN" });
  if (!project) notFound();
  const [query, settings] = await Promise.all([searchParams, getSystemSettings()]);
  return <div className={`${s.main} ${s.embedded}`}><ProjectWorkspace project={project} admin tab={query.tab} stageId={query.stage} retentionDefault={settings.archivedProjectRetentionDays} /></div>;
}
