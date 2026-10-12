"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/server/auth/admin-auth";
import { hashAdminPassword } from "@/server/auth/admin-password";
import { prisma } from "@/server/db/prisma";
import { requireSameOrigin } from "@/server/security/request";
import { appendAudit } from "@/server/security/audit-journal";
import type { ActionState } from "@/app/client/actions";

const username = z.string().trim().toLowerCase().regex(/^[a-z0-9._@+-]{3,100}$/);
const password = z.string().min(12).max(200);
const id = z.uuid();
const failure = (error: unknown): ActionState => ({ ok: false, message: error instanceof z.ZodError ? "Проверьте логин и пароль: минимум 12 символов." : typeof error === "object" && error && "code" in error && error.code === "P2002" ? "Логин уже занят." : "Действие не выполнено. Попробуйте снова." });

export async function createOperator(_state: ActionState, form: FormData): Promise<ActionState> {
  await requireSameOrigin();
  const owner = await requireOwner();
  try {
    const data = z.object({ username, password }).parse(Object.fromEntries(form));
    await prisma.$transaction(async tx => {
      const operator = await tx.adminUser.create({ data: { username: data.username, passwordHash: hashAdminPassword(data.password), role: "operator" } });
      await appendAudit(tx, { eventType: "OPERATOR_CREATED", entityType: "ADMIN_USER", entityId: operator.id, metadata: { actorId: owner.adminId } });
    });
    revalidatePath("/admin/staff");
    return { ok: true, message: "Оператор создан. Передайте данные для входа защищённым способом." };
  } catch (error) { return failure(error); }
}

export async function manageOperator(operatorId: string, command: string, _state: ActionState, form: FormData): Promise<ActionState> {
  await requireSameOrigin();
  const owner = await requireOwner();
  try {
    const targetId = id.parse(operatorId);
    const action = z.enum(["block", "unblock", "reset", "revoke"]).parse(command);
    const newPassword = action === "reset" ? password.parse(form.get("password")) : null;
    await prisma.$transaction(async tx => {
      const target = await tx.adminUser.findUnique({ where: { id: targetId }, select: { role: true, active: true } });
      if (target?.role !== "operator") throw new Error("Недоступная учётная запись");
      await tx.adminUser.update({ where: { id: targetId }, data: { ...(action === "block" ? { active: false } : {}), ...(action === "unblock" ? { active: true } : {}), ...(newPassword ? { passwordHash: hashAdminPassword(newPassword) } : {}), sessionVersion: { increment: 1 } } });
      const eventType = { block: "OPERATOR_BLOCKED", unblock: "OPERATOR_UNBLOCKED", reset: "OPERATOR_CREDENTIALS_RESET", revoke: "OPERATOR_SESSIONS_REVOKED" }[action];
      await appendAudit(tx, { eventType, entityType: "ADMIN_USER", entityId: targetId, metadata: { actorId: owner.adminId } });
    });
    revalidatePath("/admin/staff");
    return { ok: true, message: action === "block" ? "Доступ заблокирован, сеансы завершены." : action === "unblock" ? "Доступ восстановлен. Старые сеансы закрыты." : action === "reset" ? "Пароль изменён, все сеансы закрыты." : "Все сеансы оператора закрыты." };
  } catch (error) { return failure(error); }
}
