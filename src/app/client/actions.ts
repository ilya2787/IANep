"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { requireAdmin, canAttemptAdminLogin, recordAdminLoginFailure, clearAdminLoginFailures } from "@/server/auth/admin-auth";
import { hashAdminPassword, verifyAdminPassword } from "@/server/auth/admin-password";
import { createClientSession, deleteClientSession, requireClient } from "@/server/client/auth";
import { addStage, decide, event, publish, withProject, resolveAttachment, WorkspaceError, type Actor } from "@/server/client/service";
import { idSchema, attachmentSchema, safeUrl, textSchema, titleSchema } from "@/server/client/model";
import { archiveProject, restoreProject } from "@/server/client/archive";
import { headers } from "next/headers";
import { requireSameOrigin } from "@/server/security/request";
import { dispatchPendingNotifications, enqueueForActiveAdmins, enqueueNotification, markNotificationRead } from "@/server/notifications/service";
import { securityAudit } from "@/server/security/audit";
import { clientIp } from "@/server/security/client-ip";

export type ActionState = { ok: boolean; message: string };
function failure(error: unknown): ActionState {
  if (error instanceof WorkspaceError) return { ok: false, message: error.message };
  if (error instanceof z.ZodError) return { ok: false, message: "Проверьте обязательные поля, формат ссылки, даты и суммы." };
  if (typeof error === "object" && error && "code" in error && error.code === "P2002") return { ok: false, message: "Такой логин или запись уже существует. Обновите страницу." };
  console.error("Ошибка клиентского кабинета", error instanceof Error ? error.name : "Неизвестная ошибка");
  return { ok: false, message: "Не удалось сохранить изменения. Попробуйте снова." };
}
export async function loginClient(_state: ActionState, form: FormData): Promise<ActionState> {
  await requireSameOrigin();
  const parsed = z.object({ username: z.string().trim().min(1).max(100), password: z.string().min(1).max(500) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Введите логин и пароль." };
  const requestHeaders = await headers();
  const address = clientIp(requestHeaders);
  const key = `client:${address}:${parsed.data.username.toLowerCase()}`;
  if (!canAttemptAdminLogin(key)) { await securityAudit("AUTH_RATE_LIMITED", "CLIENT_LOGIN", key); return { ok: false, message: "Слишком много попыток. Попробуйте через 15 минут." }; }
  try {
    const client = await prisma.clientUser.findUnique({ where: { username: parsed.data.username.toLowerCase() } });
    const fallback = "scrypt$16384$8$1$aWFuZXAtZHVtbXktYWRtaW4tc2FsdA$x7HXWkByn5k-1A_MyGL_XfFNhOHNCMaIzE5GCfoqyV7vfH1ZrlvVsKwYE6FPOCC5HTgRs1A0zpARw4LBMr-zlA";
    const valid = verifyAdminPassword(parsed.data.password, client?.passwordHash ?? fallback);
    if (!client?.active || !valid) { recordAdminLoginFailure(key); await securityAudit("AUTH_FAILED", "CLIENT_LOGIN", key); return { ok: false, message: "Неверный логин или пароль." }; }
    await createClientSession(client.id, client.sessionVersion); clearAdminLoginFailures(key);
    await securityAudit("AUTH_SUCCEEDED", "CLIENT_USER", client.id);
  } catch (error) { return failure(error); }
  redirect("/client");
}
export async function logoutClient() { await requireSameOrigin(); const client = await requireClient(); await deleteClientSession(); await securityAudit("SESSION_REVOKED", "CLIENT_USER", client.id); redirect("/client/login"); }
export async function createClient(_state: ActionState, form: FormData): Promise<ActionState> {
  await requireSameOrigin();
  await requireAdmin();
  try {
    const data = z.object({ name: titleSchema, username: z.string().trim().toLowerCase().regex(/^[a-z0-9._@+-]{3,100}$/), password: z.string().min(12).max(200), email: z.union([z.literal(""), z.email().max(320)]) }).parse(Object.fromEntries(form));
    await prisma.clientUser.create({ data: { name: data.name, username: data.username, passwordHash: hashAdminPassword(data.password), email: data.email || null } });
    revalidatePath("/admin/projects"); return { ok: true, message: "Аккаунт создан. Передайте клиенту логин и пароль безопасным способом. Сообщение не отправлялось." };
  } catch (error) { return failure(error); }
}
export async function createProject(_state: ActionState, form: FormData): Promise<ActionState> {
  await requireSameOrigin();
  const admin = await requireAdmin(); let id: string;
  try {
    const data = z.object({ clientId: idSchema, title: titleSchema, description: textSchema }).parse(Object.fromEntries(form));
    const client = await prisma.clientUser.findFirst({ where: { id: data.clientId, active: true } });
    if (!client) throw new WorkspaceError("Выберите действующего клиента.");
    const project = await prisma.$transaction(async tx => {
      const created = await tx.clientProject.create({ data: { ...data, events: { create: { type: "PROJECT_CREATED", message: "Проект создан. Готовим план работы.", actorId: admin.adminId, actorSide: "ADMIN" } } } });
      await enqueueNotification(tx, { recipient: { clientId: data.clientId }, projectId: created.id, eventType: "PROJECT_ASSIGNED", title: "Вам назначен проект", message: `Проект «${data.title}» доступен в кабинете.`, href: `/client/projects/${created.id}`, email: true });
      return created;
    }); id = project.id;
  } catch (error) { return failure(error); }
  await dispatchPendingNotifications(); revalidatePath("/admin/projects"); redirect(`/admin/projects/${id}`);
}
const optionalDate = z.string().refine(value => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value)).transform(value => value ? new Date(`${value}T00:00:00Z`) : null);
export async function adminProjectAction(projectId: string, command: string, _state: ActionState, form: FormData): Promise<ActionState> {
  await requireSameOrigin();
  const session = await requireAdmin(); const actor: Actor = { id: session.adminId, side: "ADMIN" };
  try {
    if (command === "add-stage") await addStage(projectId, actor, form.get("title"));
    else if (command === "archive-project") {
      const value = z.union([z.literal("forever"), z.string().regex(/^\d{2,4}$/)]).parse(form.get("retention"));
      await archiveProject(projectId, actor, value === "forever" ? null : Number(value));
    } else if (command === "restore-project") await restoreProject(projectId, actor);
    else if (command === "publish") {
      const titles = form.getAll("materialTitle"); const urls = form.getAll("url"); const kinds = form.getAll("kind"); const files = form.getAll("fileId");
      await publish(projectId, actor, { stageId: form.get("stageId"), comment: form.get("comment"), materials: titles.map((title, index) => (files[index] ? { title, fileId: files[index] } : { title, url: urls[index], kind: kinds[index] })) });
    } else await withProject(projectId, actor, async tx => {
      if (command === "stage") {
        const data = z.object({ stageId: idSchema, title: titleSchema, description: textSchema, operation: z.enum(["save", "up", "down", "archive"]), status: z.enum(["PREPARATION", "IN_PROGRESS", "IN_REVIEW", "REVISION", "COMPLETED", "WARRANTY"]) }).parse(Object.fromEntries(form));
        const stage = await tx.projectStage.findFirst({ where: { id: data.stageId, projectId, archivedAt: null }, include: { versions: { orderBy: { number: "desc" }, take: 1, include: { decision: true } } } });
        if (!stage) throw new WorkspaceError("Этап недоступен.");
        if (data.operation === "archive") {
          if (stage.versions[0] && !stage.versions[0].decision) throw new WorkspaceError("Дождитесь решения клиента перед удалением этапа.");
          await tx.projectStage.update({ where: { id: stage.id }, data: { archivedAt: new Date() } });
          await event(tx, projectId, actor, "STAGE_ARCHIVED", `Этап «${stage.title}» убран из плана. История сохранена.`);
        } else if (data.operation === "up" || data.operation === "down") {
          const neighbor = await tx.projectStage.findFirst({ where: { projectId, archivedAt: null, position: data.operation === "up" ? { lt: stage.position } : { gt: stage.position } }, orderBy: { position: data.operation === "up" ? "desc" : "asc" } });
          if (neighbor) { await tx.projectStage.update({ where: { id: neighbor.id }, data: { position: stage.position } }); await tx.projectStage.update({ where: { id: stage.id }, data: { position: neighbor.position } }); }
        } else {
          if (data.status !== stage.status && (stage.status === "IN_REVIEW" || data.status === "IN_REVIEW" || data.status === "REVISION" || ((data.status === "COMPLETED" || data.status === "WARRANTY") && stage.versions[0]?.decision?.kind !== "ACCEPTED"))) throw new WorkspaceError("Согласование и правки меняются через публикацию и решение клиента. Завершение доступно после принятия результата.");
          await tx.projectStage.update({ where: { id: stage.id }, data: { title: data.title, description: data.description, status: data.status } });
          await event(tx, projectId, actor, "STAGE_UPDATED", `Обновлён этап «${data.title}».`);
        }
      } else if (command === "exception") {
        const data = z.object({ decisionId: idSchema, reason: textSchema.min(1), counts: z.enum(["yes", "no"]) }).parse(Object.fromEntries(form));
        const decision = await tx.stageDecision.findFirst({ where: { id: data.decisionId, kind: "CHANGES", version: { stage: { projectId } } } });
        if (!decision) throw new WorkspaceError("Раунд правок не найден.");
        await tx.stageDecision.update({ where: { id: decision.id }, data: { countsTowardLimit: data.counts === "yes", exceptionReason: data.reason } });
        await event(tx, projectId, actor, "ROUND_CLASSIFIED", `Учёт раунда правок: ${data.counts === "yes" ? "включён в лимит" : "не учитывается"}. ${data.reason}`);
      } else if (command === "project") {
        const data = z.object({ title: titleSchema, description: textSchema, nextAction: textSchema, status: z.enum(["PREPARATION", "IN_PROGRESS", "COMPLETED", "WARRANTY"]), launchedAt: optionalDate }).parse(Object.fromEntries(form));
        if (data.status === "WARRANTY" && !data.launchedAt) throw new WorkspaceError("Укажите дату запуска для гарантии.");
        const before = await tx.clientProject.findUniqueOrThrow({ where: { id: projectId }, select: { clientId: true, status: true, launchedAt: true, nextAction: true } });
        await tx.clientProject.update({ where: { id: projectId }, data });
        await event(tx, projectId, actor, "PROJECT_UPDATED", "Обновлены состояние проекта и следующий шаг.");
        if (before.status !== data.status || before.launchedAt?.getTime() !== data.launchedAt?.getTime() || before.nextAction !== data.nextAction) await enqueueNotification(tx, { recipient: { clientId: before.clientId }, projectId, eventType: data.status === "WARRANTY" ? "PROJECT_WARRANTY" : data.launchedAt && !before.launchedAt ? "PROJECT_LAUNCHED" : "PROJECT_MILESTONE_UPDATED", title: data.status === "WARRANTY" ? "Проект перешёл на гарантию" : data.launchedAt && !before.launchedAt ? "Проект запущен" : "Изменился следующий шаг проекта", message: data.nextAction || "Откройте проект, чтобы увидеть актуальное состояние.", href: `/client/projects/${projectId}`, email: true });
      } else if (command === "client-access") {
        const data = z.object({ name: titleSchema, username: z.union([z.literal(""), z.string().trim().toLowerCase().regex(/^[a-z0-9._@+-]{3,100}$/)]), password: z.union([z.literal(""), z.string().min(12).max(200)]) }).parse(Object.fromEntries(form));
        const project = await tx.clientProject.findUnique({ where: { id: projectId }, select: { clientId: true } });
        if (!project) throw new WorkspaceError("Проект не найден.");
        await tx.clientUser.update({ where: { id: project.clientId }, data: { name: data.name, ...(data.username ? { username: data.username } : {}), ...(data.password ? { passwordHash: hashAdminPassword(data.password), sessionVersion: { increment: 1 } } : {}) } });
        await event(tx, projectId, actor, "CLIENT_ACCESS_UPDATED", data.password ? "Обновлены логин и пароль клиента. Активные сессии завершены." : "Обновлены данные доступа клиента.");
        await enqueueNotification(tx, { recipient: { clientId: project.clientId }, projectId, eventType: "ACCESS_CHANGED", title: "Изменены данные доступа", message: data.password ? "Пароль изменён, другие активные сессии завершены." : "Обновлены данные вашего профиля.", href: `/client/projects/${projectId}`, email: true });
      } else if (command === "reset-client-sessions") {
        const project = await tx.clientProject.findUnique({ where: { id: projectId }, select: { clientId: true } });
        if (!project) throw new WorkspaceError("Проект не найден.");
        await tx.clientUser.update({ where: { id: project.clientId }, data: { sessionVersion: { increment: 1 } } });
        await event(tx, projectId, actor, "CLIENT_SESSIONS_RESET", "Все активные сессии клиента завершены.");
      } else if (command === "payment") {
        const data = z.object({ title: titleSchema, amount: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/).refine(value => Number(value) > 0), status: z.enum(["PLANNED", "DUE", "PAID", "CANCELLED"]), dueAt: optionalDate, paidAt: optionalDate, documentUrl: z.union([z.literal(""), safeUrl]) }).parse(Object.fromEntries(form));
        if (data.status === "PAID" && !data.paidAt) throw new WorkspaceError("Укажите дату оплаты.");
        const paymentId = form.get("paymentId");
        if (paymentId) {
          idSchema.parse(paymentId);
          const result = await tx.projectPayment.updateMany({ where: { id: String(paymentId), projectId }, data: { ...data, documentUrl: data.documentUrl || null, paidAt: data.status === "PAID" ? data.paidAt : null } });
          if (!result.count) throw new WorkspaceError("Платёж не найден.");
        } else await tx.projectPayment.create({ data: { ...data, projectId, documentUrl: data.documentUrl || null, paidAt: data.status === "PAID" ? data.paidAt : null } });
        await event(tx, projectId, actor, "PAYMENT_UPDATED", `Обновлён платёж «${data.title}».`);
        const project = await tx.clientProject.findUniqueOrThrow({ where: { id: projectId }, select: { clientId: true } });
        await enqueueNotification(tx, { recipient: { clientId: project.clientId }, projectId, eventType: "PAYMENT_UPDATED", title: "Изменился платёж", message: `Обновлена информация по платежу «${data.title}».`, href: `/client/projects/${projectId}?tab=payments`, email: true });
      } else throw new WorkspaceError("Неизвестное действие.");
    });
    refreshProject(projectId); await dispatchPendingNotifications(); return { ok: true, message: "Изменения сохранены." };
  } catch (error) { return failure(error); }
}
function refreshProject(id: string) { revalidatePath("/admin/projects", "layout"); revalidatePath(`/admin/projects/${id}`); revalidatePath("/client", "layout"); }
export async function clientDecision(projectId: string, _state: ActionState, form: FormData): Promise<ActionState> {
  await requireSameOrigin();
  const client = await requireClient();
  try { await decide(projectId, { id: client.id, side: "CLIENT" }, Object.fromEntries(form)); await dispatchPendingNotifications(); refreshProject(projectId); return { ok: true, message: "Решение сохранено. IANep увидит его в проекте." }; } catch (error) { return failure(error); }
}
export async function addMaterial(projectId: string, side: "ADMIN" | "CLIENT", _state: ActionState, form: FormData): Promise<ActionState> {
  await requireSameOrigin();
  const actor: Actor = side === "ADMIN" ? { id: (await requireAdmin()).adminId, side } : { id: (await requireClient()).id, side: "CLIENT" };
  try {
    const input = form.get("fileId") ? { title: form.get("title"), fileId: form.get("fileId") } : Object.fromEntries(form);
    const data = attachmentSchema.parse(input); const stageId = form.get("stageId") ? idSchema.parse(form.get("stageId")) : null;
    await withProject(projectId, actor, async tx => {
      if (stageId && !await tx.projectStage.findFirst({ where: { id: stageId, projectId, archivedAt: null } })) throw new WorkspaceError("Этап недоступен.");
      const material = await resolveAttachment(tx, projectId, actor, data);
      await tx.projectMaterial.create({ data: { ...material, projectId, stageId, authorId: actor.id, authorSide: actor.side } });
      await event(tx, projectId, actor, "MATERIAL_ADDED", `Добавлен материал «${data.title}».`);
      if (actor.side === "CLIENT") {
        await enqueueForActiveAdmins(tx, { projectId, eventType: "MATERIAL_ADDED", title: "Клиент добавил материал", message: `Материал «${data.title}» доступен в проекте.`, href: `/admin/projects/${projectId}?tab=materials` });
      } else if (form.get("notify") === "yes") {
          const project = await tx.clientProject.findUniqueOrThrow({ where: { id: projectId }, select: { clientId: true } });
          await enqueueNotification(tx, { recipient: { clientId: project.clientId }, projectId, eventType: "IMPORTANT_MATERIAL", title: "Добавлен важный материал", message: `Материал «${data.title}» доступен в проекте.`, href: `/client/projects/${projectId}?tab=materials`, email: true });
      }
    }); await dispatchPendingNotifications(); refreshProject(projectId); return { ok: true, message: "Материал добавлен." };
  } catch (error) { return failure(error); }
}

export async function readNotification(id: string) {
  await requireSameOrigin();
  const parsed = idSchema.parse(id);
  const client = await requireClient();
  await markNotificationRead({ clientId: client.id }, parsed);
  revalidatePath("/client", "layout");
}

export async function readAllClientNotifications() {
  await requireSameOrigin();
  const client = await requireClient();
  await markNotificationRead({ clientId: client.id });
  revalidatePath("/client", "layout");
}

export async function readAdminNotification(id: string) {
  await requireSameOrigin();
  const parsed = idSchema.parse(id);
  const admin = await requireAdmin();
  await markNotificationRead({ adminId: admin.adminId }, parsed);
  revalidatePath("/admin", "layout");
}

export async function readAllAdminNotifications() {
  await requireSameOrigin();
  const admin = await requireAdmin();
  await markNotificationRead({ adminId: admin.adminId });
  revalidatePath("/admin", "layout");
}

export async function updateClientNotificationSettings(_state: ActionState, form: FormData): Promise<ActionState> {
  await requireSameOrigin();
  const client = await requireClient();
  try {
    const data = z.object({ email: z.union([z.literal(""), z.email().max(320)]), emailNotifications: z.string().optional() }).parse(Object.fromEntries(form));
    const enabled = data.emailNotifications === "yes";
    if (enabled && !data.email) throw new WorkspaceError("Укажите e-mail, чтобы включить уведомления.");
    await prisma.clientUser.update({ where: { id: client.id }, data: { email: data.email || null, emailNotificationsEnabled: enabled, notificationPreferences: { importantEmail: enabled } } });
    await securityAudit("NOTIFICATION_PREFERENCES_UPDATED", "CLIENT_USER", client.id, { importantEmail: enabled });
    revalidatePath("/client", "layout");
    return { ok: true, message: enabled ? "Важные уведомления будут приходить в кабинет и на e-mail." : "Уведомления будут приходить только в личный кабинет." };
  } catch (error) { return failure(error); }
}
