"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { authenticateAdmin, canAttemptAdminLogin, clearAdminLoginFailures, createAdminSession, deleteAdminSession, recordAdminLoginFailure } from "@/server/auth/admin-auth";
import { briefService } from "@/server/brief/brief.service";

const loginSchema = z.object({ username: z.string().trim().min(1).max(100), password: z.string().min(1).max(500) });

export async function loginAdmin(formData: FormData) {
  const input = loginSchema.safeParse({ username: formData.get("username"), password: formData.get("password") });
  if (!input.success) redirect("/admin/login?error=credentials");
  const requestHeaders = await headers();
  const address = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "local";
  const identifier = `${address}:${input.data.username}`;
  if (!canAttemptAdminLogin(identifier)) redirect("/admin/login?error=rate-limit");
  const admin = await authenticateAdmin(input.data.username, input.data.password);
  if (!admin) {
    recordAdminLoginFailure(identifier);
    redirect("/admin/login?error=credentials");
  }
  clearAdminLoginFailures(identifier);
  await createAdminSession(admin);
  redirect("/admin");
}

export async function logoutAdmin() {
  await deleteAdminSession();
  redirect("/admin/login");
}

export type StatusActionState = { message: string; ok: boolean };

export async function changeBriefStatus(id: string, _state: StatusActionState, formData: FormData): Promise<StatusActionState> {
  const result = await briefService.changeStatusForAdmin(id, formData.get("status"));
  if (!result.ok) {
    return { ok: false, message: result.reason === "CONFLICT" ? "Статус уже изменился. Обновите страницу и попробуйте снова." : "Не удалось изменить статус заявки." };
  }
  revalidatePath("/admin");
  revalidatePath(`/admin/briefs/${id}`);
  return { ok: true, message: result.changed ? "Статус обновлён." : "Этот статус уже установлен." };
}
