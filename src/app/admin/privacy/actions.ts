"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/admin-auth";
import { requireSameOrigin } from "@/server/security/request";
import { executePrivacyRequest, preparePrivacyRequest, privacyCategories, registerPrivacyRequest } from "@/server/privacy/requests";
import { WorkspaceError } from "@/server/client/service";
import type { ActionState } from "@/app/client/actions";

function failure(error: unknown): ActionState {
  return { ok: false, message: error instanceof WorkspaceError ? error.message : error instanceof z.ZodError ? "Проверьте заполненные поля." : "Операция не выполнена. Обновите страницу и попробуйте снова." };
}
const receipt = (number: number) => `PD-${String(number).padStart(6, "0")}`;

export async function registerRequest(_state: ActionState, form: FormData): Promise<ActionState> {
  await requireSameOrigin(); await requireAdmin();
  try {
    const data = z.object({
      kind: z.enum(["CONSENT_WITHDRAWAL", "ERASURE", "PROCESSING_TERMINATION", "OTHER"]),
      scope: z.enum(["BRIEF", "PROJECT", "CLIENT"]), targetId: z.uuid(),
      receivedAt: z.coerce.date(), dueAt: z.union([z.literal(""), z.coerce.date()]).optional(),
    }).parse(Object.fromEntries(form));
    const request = await registerPrivacyRequest({ ...data, dueAt: data.dueAt || null });
    revalidatePath("/admin/privacy-requests");
    return { ok: true, message: `Запрос ${receipt(request.number)} зарегистрирован. Проверьте состав данных и исключения.` };
  } catch (error) { return failure(error); }
}

export async function prepareRequest(id: string, _state: ActionState, form: FormData): Promise<ActionState> {
  await requireSameOrigin(); await requireAdmin();
  try {
    z.literal("yes").parse(form.get("reviewed"));
    const excluded = z.array(z.enum(privacyCategories)).parse(form.getAll("excludedCategory"));
    const reason = z.string().trim().max(1000).parse(form.get("exclusionReason") ?? "");
    await preparePrivacyRequest(z.uuid().parse(id), excluded, reason || null);
    revalidatePath("/admin/privacy-requests");
    return { ok: true, message: "Область подтверждена. Для исполнения требуется второе подтверждение." };
  } catch (error) { return failure(error); }
}

export async function executeRequest(id: string, _state: ActionState, form: FormData): Promise<ActionState> {
  await requireSameOrigin(); await requireAdmin();
  try {
    z.literal("yes").parse(form.get("finalConfirm"));
    const confirmation = z.string().max(100).parse(form.get("confirmation"));
    const result = await executePrivacyRequest(z.uuid().parse(id), confirmation);
    revalidatePath("/admin/privacy-requests"); revalidatePath("/admin/users"); revalidatePath("/admin/projects"); revalidatePath("/admin"); revalidatePath("/admin/system");
    return { ok: true, message: result.warnings ? `Запрос ${receipt(result.number)} исполнен. ${result.warnings} файлов в карантине требуют повторной технической очистки.` : `Запрос ${receipt(result.number)} исполнен. Персональные данные уничтожены в выбранной области.` };
  } catch (error) { return failure(error); }
}
