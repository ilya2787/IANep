import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { hashAdminPassword } from "@/server/auth/admin-password";
import { WorkspaceError } from "@/server/client/service";
import { enqueueNotification } from "@/server/notifications/service";

const inputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  clientId: z.string().uuid().optional(),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._@+-]{3,100}$/).optional(),
  password: z.string().min(12).max(200).optional(),
});
export async function startBriefProject(briefId: string, adminId: string, input: unknown) {
  z.string().uuid().parse(briefId);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM brief_requests WHERE id = ${briefId}::uuid FOR UPDATE`;
    const brief = await tx.briefRequest.findUnique({ where: { id: briefId }, include: { project: true } });
    if (!brief) throw new WorkspaceError("Заявка не найдена.");
    if (brief.project) {
      if (brief.status !== "IN_PROGRESS") {
        await tx.briefRequest.update({ where: { id: briefId }, data: { status: "IN_PROGRESS" } });
        await tx.auditEvent.create({ data: { entityType: "BriefRequest", entityId: briefId, eventType: "BRIEF_STATUS_CHANGED", metadata: { previousStatus: brief.status, newStatus: "IN_PROGRESS", actor: "ADMIN" } } });
      }
      return { projectId: brief.project.id, created: false };
    }
    const data = inputSchema.parse(input);
    let clientId = data.clientId;
    if (clientId) {
      if (!await tx.clientUser.findFirst({ where: { id: clientId, active: true } })) throw new WorkspaceError("Выберите действующего клиента.");
    } else {
      if (!data.username || !data.password) throw new WorkspaceError("Укажите логин и пароль нового клиента.");
      const answers = brief.answers && typeof brief.answers === "object" && !Array.isArray(brief.answers) ? brief.answers as Record<string, unknown> : {};
      const email = answers.contactMethod === "Email" && z.email().safeParse(brief.contact.trim()).success ? brief.contact.trim().toLowerCase() : null;
      const client = await tx.clientUser.create({ data: { name: brief.name, username: data.username, passwordHash: hashAdminPassword(data.password), email, emailNotificationsEnabled: false, notificationPreferences: { importantEmail: false } } });
      clientId = client.id;
    }
    const project = await tx.clientProject.create({ data: {
      briefId, clientId, title: data.title, status: "IN_PROGRESS",
      description: `Проект по заявке № ${brief.number}.`,
      events: { create: { type: "PROJECT_FROM_BRIEF", message: `Проект создан по заявке № ${brief.number}.`, actorId: adminId, actorSide: "ADMIN" } },
    } });
    await tx.briefRequest.update({ where: { id: briefId }, data: { status: "IN_PROGRESS" } });
    await tx.auditEvent.create({ data: { entityType: "BriefRequest", entityId: briefId, eventType: "BRIEF_PROJECT_CREATED", metadata: { previousStatus: brief.status, newStatus: "IN_PROGRESS", projectId: project.id, clientId, actor: "ADMIN" } } });
    await enqueueNotification(tx, { recipient: { clientId }, projectId: project.id, eventType: "PROJECT_ASSIGNED", title: "Вам назначен проект", message: `Проект «${project.title}» доступен в кабинете.`, href: `/client/projects/${project.id}`, email: true });
    return { projectId: project.id, created: true };
  });
}
