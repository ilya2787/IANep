import type { BriefRequestStatus } from "@/generated/prisma/client";
import { briefProjectTypes } from "@/components/sections/brief.data";

export const statusLabels: Record<BriefRequestStatus, string> = {
  NEW: "Новая",
  IN_PROGRESS: "В работе",
  IN_REVIEW: "На рассмотрении",
  CONTACTED: "Связались",
  ARCHIVED: "В архиве",
};

export function projectTypeLabel(projectType: string) {
  return briefProjectTypes.find((item) => item.id === projectType)?.label ?? projectType;
}

export function sourceLabel(source: string) {
  return source === "PUBLIC_BRIEF" ? "Публичный бриф" : source;
}

export function formatAdminDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Kaliningrad",
  }).format(date);
}

export function auditEventLabel(eventType: string) {
  if (eventType === "BRIEF_PROJECT_CREATED") return "Создан проект и заявка принята в работу";
  if (eventType === "BRIEF_CREATED") return "Заявка создана";
  if (eventType === "BRIEF_UPDATED") return "Заявка обновлена";
  if (eventType === "BRIEF_STATUS_CHANGED") return "Статус изменён";
  return "Событие заявки";
}
