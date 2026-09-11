"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/admin-auth";
import { requireSameOrigin } from "@/server/security/request";
import { executePrivacyRequest, preparePrivacyRequest, privacyCategories, registerPrivacyRequest } from "@/server/privacy/requests";
import { findCompletedPrivacyRequests } from "@/server/privacy/lookup";
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
      channel: z.enum(["EMAIL", "PHONE", "FORM", "WRITTEN", "IN_PERSON", "OTHER"]),
      scope: z.enum(["BRIEF", "PROJECT", "CLIENT"]), targetId: z.uuid(),
      receivedAt: z.coerce.date(), dueAt: z.union([z.literal(""), z.coerce.date()]).optional(),
      lookupValue: z.string().max(254).optional(),
    }).parse(Object.fromEntries(form));
    const request = await registerPrivacyRequest({ ...data, dueAt: data.dueAt || null });
    revalidatePath("/admin/privacy-requests");
    return { ok: true, message: `Запрос ${receipt(request.number)} зарегистрирован. Проверьте состав данных и исключения.` };
  } catch (error) { return failure(error); }
}

export type PrivacyLookupState = ActionState & { matches?: Array<{ number: number; receivedAt: string; completedAt: string; scope: string; categories: string[]; result: string; channel: string }> };

export async function lookupCompletedRequests(_state: PrivacyLookupState, form: FormData): Promise<PrivacyLookupState> {
  await requireSameOrigin();
  await requireAdmin();
  try {
    const data = z.object({ lookupType: z.enum(["EMAIL", "PHONE"]), lookupValue: z.string().min(1).max(254) }).parse(Object.fromEntries(form));
    const matches = await findCompletedPrivacyRequests(data.lookupType, data.lookupValue, { side: "ADMIN" });
    return {
      ok: true,
      message: matches.length ? `Найдено исполненных запросов: ${matches.length}.` : `Исполненных запросов для ${data.lookupType === "EMAIL" ? "этого email" : "этого телефона"} не найдено.`,
      matches: matches.map(item => ({ number: item.number, receivedAt: item.receivedAt!.toISOString(), completedAt: item.completedAt!.toISOString(), scope: item.scope!, categories: Array.isArray(item.destroyedCategories) ? item.destroyedCategories.filter((value): value is string => typeof value === "string") : [], result: item.result ?? "NOT_DESTROYED", channel: item.channel! })),
    };
  } catch (error) {
    if (error instanceof Error && !(error instanceof WorkspaceError) && !(error instanceof z.ZodError) && /^(Укажите|Email)/.test(error.message)) return { ok: false, message: error.message };
    return failure(error);
  }
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
