"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/admin-auth";
import { requireSameOrigin } from "@/server/security/request";
import { prisma } from "@/server/db/prisma";
import { cleanArchivedProjectFiles, cleanOrphanFiles, deleteArchivedBriefs } from "@/server/storage/lifecycle";
import { deleteUnusedClient, setClientActive } from "@/server/client/users";
import { WorkspaceError } from "@/server/client/service";
import type { ActionState } from "@/app/client/actions";

function failure(error: unknown): ActionState { return { ok: false, message: error instanceof WorkspaceError ? error.message : error instanceof z.ZodError ? "Проверьте выбранные данные." : "Операция не выполнена. Обновите страницу и попробуйте снова." }; }

export async function updateRetentionSettings(_state: ActionState, form: FormData): Promise<ActionState> {
  await requireSameOrigin(); const admin = await requireAdmin();
  try {
    const data = z.object({ projectDays: z.coerce.number().int().min(30).max(3650), briefDays: z.coerce.number().int().min(30).max(3650), warningDays: z.coerce.number().int().min(1).max(365), autoCleanup: z.string().optional() }).parse(Object.fromEntries(form));
    await prisma.$transaction(async tx => {
      await tx.systemSetting.upsert({ where: { id: "default" }, update: { archivedProjectRetentionDays: data.projectDays, archivedBriefRetentionDays: data.briefDays, cleanupWarningDays: data.warningDays, automaticCleanupEnabled: false }, create: { id: "default", archivedProjectRetentionDays: data.projectDays, archivedBriefRetentionDays: data.briefDays, cleanupWarningDays: data.warningDays, automaticCleanupEnabled: false } });
      await tx.auditEvent.create({ data: { eventType: "RETENTION_SETTINGS_UPDATED", entityType: "SYSTEM", entityId: "retention", metadata: { adminId: admin.adminId, projectDays: data.projectDays, briefDays: data.briefDays, warningDays: data.warningDays, automaticCleanupEnabled: false } } });
    });
    revalidatePath("/admin/system"); return { ok: true, message: "Настройки хранения сохранены. Автоматическая очистка остаётся выключенной." };
  } catch (error) { return failure(error); }
}

export async function cleanupSelectedProjects(_state: ActionState, form: FormData): Promise<ActionState> {
  await requireSameOrigin(); const admin = await requireAdmin();
  try { z.literal("yes").parse(form.get("confirm")); const ids = z.array(z.uuid()).min(1).parse(form.getAll("projectId")); const result = await cleanArchivedProjectFiles(ids, admin.adminId); revalidatePath("/admin/system"); return { ok: true, message: `Очищено файлов: ${result.files}. История проектов сохранена.` }; } catch (error) { return failure(error); }
}

export async function updateAdminNotificationEmail(_state: ActionState, form: FormData): Promise<ActionState> {
  await requireSameOrigin(); const admin = await requireAdmin();
  try {
    const data = z.object({ email: z.union([z.literal(""), z.email().max(320)]) }).parse(Object.fromEntries(form));
    await prisma.$transaction(async tx => {
      await tx.systemSetting.upsert({ where: { id: "default" }, update: { adminNotificationEmail: data.email || null }, create: { id: "default", adminNotificationEmail: data.email || null } });
      await tx.auditEvent.create({ data: { eventType: "ADMIN_NOTIFICATION_EMAIL_UPDATED", entityType: "SYSTEM", entityId: "notifications", metadata: { adminId: admin.adminId, enabled: Boolean(data.email) } } });
    });
    revalidatePath("/admin/system");
    return { ok: true, message: data.email ? "Адрес для уведомлений сохранён." : "Email-уведомления администратора отключены." };
  } catch (error) { return failure(error); }
}

export async function cleanupSelectedBriefs(_state: ActionState, form: FormData): Promise<ActionState> {
  await requireSameOrigin(); const admin = await requireAdmin();
  try { z.literal("yes").parse(form.get("confirm")); const ids = z.array(z.uuid()).min(1).parse(form.getAll("briefId")); const result = await deleteArchivedBriefs(ids, admin.adminId); revalidatePath("/admin/system"); revalidatePath("/admin"); return { ok: true, message: `Удалено архивных заявок: ${result.count}.` }; } catch (error) { return failure(error); }
}

export async function cleanupOrphans(_state: ActionState, form: FormData): Promise<ActionState> {
  await requireSameOrigin(); const admin = await requireAdmin();
  try { z.literal("yes").parse(form.get("confirm")); const result = await cleanOrphanFiles(admin.adminId); revalidatePath("/admin/system"); return { ok: true, message: `Удалено orphan/temp файлов: ${result.files}.` }; } catch (error) { return failure(error); }
}

export async function manageClient(command: string, id: string, _state: ActionState): Promise<ActionState> {
  void _state;
  await requireSameOrigin(); const admin = await requireAdmin();
  try { const clientId = z.uuid().parse(id); const operation = z.enum(["deactivate", "reactivate", "delete"]).parse(command); if (operation === "delete") await deleteUnusedClient(clientId, admin.adminId); else await setClientActive(clientId, operation === "reactivate", admin.adminId); revalidatePath("/admin/users"); revalidatePath("/admin/projects"); return { ok: true, message: operation === "delete" ? "Ошибочно созданный аккаунт удалён." : operation === "reactivate" ? "Доступ пользователя восстановлен." : "Пользователь заблокирован, активные сессии завершены." }; } catch (error) { return failure(error); }
}
