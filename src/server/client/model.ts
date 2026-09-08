import { z } from "zod";

export const statuses = { PREPARATION: "Подготовка", IN_PROGRESS: "В работе", IN_REVIEW: "На согласовании", REVISION: "Правки", COMPLETED: "Завершён", WARRANTY: "Гарантия" };
export const kinds = { IMAGE: "Изображение", DOCUMENT: "Документ / PDF", FILE: "Файл", LINK: "Внешняя ссылка" };
export const paymentStatuses = { PLANNED: "Запланирован", DUE: "Ожидается оплата", PAID: "Оплачен", CANCELLED: "Отменён" };
export const safeUrl = z.string().trim().max(2000).url().refine(value => { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password; }, "Укажите ссылку http или https без пароля.");
export const materialSchema = z.object({ title: z.string().trim().min(1).max(200), kind: z.enum(["IMAGE", "DOCUMENT", "FILE", "LINK"]), url: safeUrl });
export const idSchema = z.string().uuid();
export const titleSchema = z.string().trim().min(1).max(200);
export const textSchema = z.string().trim().max(10000);
export const dateLabel = (date: Date | null) => date ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeZone: "Europe/Kaliningrad" }).format(date) : "Не указана";
export const timeLabel = (date: Date) => new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Kaliningrad" }).format(date);
export function warrantyEnd(date: Date, days = 30) { const result = new Date(date); result.setUTCDate(result.getUTCDate() + days); return result; }
export const attachmentSchema = z.union([
  z.object({ title: titleSchema, fileId: idSchema }),
  materialSchema,
]);
