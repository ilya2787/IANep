"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { authenticateAdmin, canAttemptAdminLogin, clearAdminLoginFailures, createAdminSession, deleteAdminSession, recordAdminLoginFailure, requireAdmin } from "@/server/auth/admin-auth";
import { startBriefProject } from "@/server/brief/brief-project";
import { WorkspaceError } from "@/server/client/service";
import { briefService } from "@/server/brief/brief.service";
import { requireSameOrigin } from "@/server/security/request";
import { securityAudit } from "@/server/security/audit";
import { dispatchPendingNotifications } from "@/server/notifications/service";
import { clientIp } from "@/server/security/client-ip";

const loginSchema = z.object({ username: z.string().trim().min(1).max(100), password: z.string().min(1).max(500) });

export async function loginAdmin(formData: FormData) {
  await requireSameOrigin();
  const input = loginSchema.safeParse({ username: formData.get("username"), password: formData.get("password") });
  if (!input.success) redirect("/admin/login?error=credentials");
  const requestHeaders = await headers();
  const address = clientIp(requestHeaders);
  const identifier = `${address}:${input.data.username}`;
  if (!canAttemptAdminLogin(identifier)) { await securityAudit("AUTH_RATE_LIMITED", "ADMIN_LOGIN", identifier); redirect("/admin/login?error=rate-limit"); }
  const admin = await authenticateAdmin(input.data.username, input.data.password);
  if (!admin) {
    recordAdminLoginFailure(identifier); await securityAudit("AUTH_FAILED", "ADMIN_LOGIN", identifier);
    redirect("/admin/login?error=credentials");
  }
  clearAdminLoginFailures(identifier);
  await createAdminSession(admin);
  await securityAudit("AUTH_SUCCEEDED", "ADMIN_USER", admin.id);
  redirect("/admin");
}

export async function logoutAdmin() {
  await requireSameOrigin();
  const admin = await requireAdmin();
  await deleteAdminSession();
  await securityAudit("SESSION_REVOKED", "ADMIN_USER", admin.adminId);
  redirect("/admin/login");
}

export type StatusActionState = { message: string; ok: boolean; projectId?: string };

export async function changeBriefStatus(id: string, _state: StatusActionState, formData: FormData): Promise<StatusActionState> {
  await requireSameOrigin();
  const admin = await requireAdmin();
  if (formData.get("status") === "IN_PROGRESS") {
    try {
      const result = await startBriefProject(id, admin.adminId, {
        title: formData.get("title"),
        ...(formData.get("clientId") ? { clientId: formData.get("clientId") } : { username: formData.get("username"), password: formData.get("password") }),
      });
      await dispatchPendingNotifications();
      revalidatePath("/admin"); revalidatePath(`/admin/briefs/${id}`); revalidatePath("/admin/projects"); revalidatePath("/client", "layout");
      return { ok: true, projectId: result.projectId, message: result.created ? "Заявка в работе. Проект и доступ клиента готовы. Передайте клиенту данные для входа; сообщение не отправлялось." : "Заявка в работе. Открывайте связанный проект." };
    } catch (error) {
      return { ok: false, message: error instanceof WorkspaceError ? error.message : error instanceof z.ZodError ? "Проверьте название, логин и пароль (от 12 символов)." : typeof error === "object" && error && "code" in error && error.code === "P2002" ? "Логин уже занят. Выберите существующего клиента или другой логин." : "Не удалось начать проект. Изменения не сохранены. Попробуйте снова." };
    }
  }
  const result = await briefService.changeStatusForAdmin(id, formData.get("status"));
  if (!result.ok) {
    return { ok: false, message: result.reason === "CONFLICT" ? "Статус уже изменился. Обновите страницу и попробуйте снова." : "Не удалось изменить статус заявки." };
  }
  revalidatePath("/admin");
  revalidatePath(`/admin/briefs/${id}`);
  return { ok: true, message: result.changed ? "Статус обновлён." : "Этот статус уже установлен." };
}
