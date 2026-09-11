import type { JournalCategory } from "@/server/security/audit-journal";

export const journalCategoryLabels: Record<JournalCategory, string> = {
  BRIEFS: "Заявки", PROJECTS: "Проекты", CLIENTS: "Клиенты", PAYMENTS: "Оплаты",
  MATERIALS: "Материалы", NOTIFICATIONS: "Уведомления", PRIVACY: "Персональные данные", SYSTEM: "Система",
};

const eventLabels: Record<string, string> = {
  BRIEF_CREATED: "Получена новая заявка", BRIEF_UPDATED: "Заявка обновлена", BRIEF_STATUS_CHANGED: "Статус заявки изменён", BRIEF_PROJECT_CREATED: "Заявка принята в работу",
  CLIENT_CREATED: "Создан клиентский аккаунт", CLIENT_DEACTIVATED: "Клиентский аккаунт отключён", CLIENT_REACTIVATED: "Клиентский аккаунт включён", UNUSED_CLIENT_DELETED: "Неиспользуемый аккаунт удалён",
  PROJECT_CREATED: "Создан проект", PROJECT_UPDATED: "Проект обновлён", PROJECT_ARCHIVED: "Проект перенесён в архив", PROJECT_RESTORED: "Проект восстановлен",
  STAGE_CREATED: "Создан этап проекта", STAGE_UPDATED: "Этап проекта обновлён", STAGE_ARCHIVED: "Этап проекта перенесён в архив", RESULT_PUBLISHED: "Опубликован результат этапа",
  ACCEPTED: "Клиент принял результат", CHANGES: "Клиент запросил изменения", ROUND_CLASSIFIED: "Раунд изменений учтён",
  PAYMENT_UPDATED: "Данные об оплате обновлены", MATERIAL_ADDED: "Добавлен материал",
  NOTIFICATION_ENQUEUED: "Уведомление подготовлено к отправке", NOTIFICATION_DISPATCHED: "Отправка уведомлений завершена", NOTIFICATION_PREFERENCES_UPDATED: "Настройки уведомлений изменены",
  PRIVACY_REQUEST_REGISTERED: "Запрос субъекта зарегистрирован", PRIVACY_REQUEST_PREPARED: "Состав данных подтверждён", PRIVACY_REQUEST_COMPLETED: "Запрос субъекта исполнен", PRIVACY_RECEIPTS_PURGED: "Истёк срок хранения подтверждения уничтожения ПД; данные подтверждения очищены",
  STORAGE_CLEANUP_COMPLETED: "Очистка файлов завершена", ARCHIVED_BRIEFS_DELETED: "Архивные заявки удалены", ORPHAN_STORAGE_CLEANUP_COMPLETED: "Очистка несвязанных файлов завершена",
  RETENTION_SETTINGS_UPDATED: "Сроки хранения изменены", ADMIN_NOTIFICATION_EMAIL_UPDATED: "Адрес уведомлений администратора изменён",
  AUTH_RATE_LIMITED: "Вход временно ограничен", AUTH_FAILED: "Неудачная попытка входа", AUTH_SUCCEEDED: "Выполнен вход", SESSION_REVOKED: "Сеанс завершён",
};

const entityLabels: Record<string, string> = {
  BriefRequest: "заявка", PROJECT: "проект", CLIENT_USER: "клиентский аккаунт", PERSONAL_DATA_REQUEST: "запрос о персональных данных",
  NOTIFICATION: "уведомление", SYSTEM: "система", ADMIN_USER: "администратор", ADMIN_LOGIN: "вход администратора", CLIENT_LOGIN: "вход клиента",
};

const valueLabels: Record<string, string> = {
  PREPARATION: "Подготовка", IN_PROGRESS: "В работе", IN_REVIEW: "На согласовании", REVISION: "На доработке", COMPLETED: "Завершён", WARRANTY: "На гарантии",
  NEW: "Новая", CONTACTED: "Связались", ARCHIVED: "В архиве", PLANNED: "Запланирована", DUE: "Ожидает оплаты", PAID: "Оплачена", CANCELLED: "Отменена",
  ADMIN: "Администратор", CLIENT: "Клиент", EMAIL: "Email", PHONE: "Телефон", IN_PERSON: "Лично", OTHER: "Другой канал",
  BRIEF: "Заявка", PROJECT: "Проект", DESTROYED: "Данные уничтожены", PARTIALLY_PRESERVED: "Часть данных сохранена по основанию", NOT_DESTROYED: "Данные не уничтожены",
  CONSENT_WITHDRAWAL: "Отзыв согласия", ERASURE: "Требование об уничтожении", PROCESSING_TERMINATION: "Прекращение обработки",
  IMAGE: "Изображение", DOCUMENT: "Документ", FILE: "Файл", LINK: "Ссылка", true: "да", false: "нет",
};

const metadataLabels: Record<string, string> = {
  previousStatus: "Было", newStatus: "Стало", actor: "Инициатор", actorSide: "Инициатор", status: "Статус", kind: "Тип", scope: "Область", channel: "Канал",
  requestNumber: "Номер запроса", excludedCategoryCount: "Сохранено категорий", destroyedCategoryCount: "Уничтожено категорий", result: "Результат", storageWarnings: "Предупреждений по файлам",
  sessionsRevoked: "Сеансы завершены", dependencyCount: "Связанных объектов", retentionDays: "Срок хранения, дней", version: "Версия", countsTowardLimit: "Учтено в лимите",
  hasDueDate: "Срок указан", hasPaidDate: "Дата оплаты указана", hasDocument: "Документ приложен", physicalFile: "Файл загружен", eventType: "Событие уведомления", channelCount: "Каналов отправки",
  sent: "Отправлено", failed: "Ошибок", skipped: "Пропущено", importantEmail: "Важные письма", files: "Файлов", bytes: "Объём, байт", preservedHistory: "История сохранена",
  count: "Количество", projectDays: "Хранение проектов, дней", briefDays: "Хранение заявок, дней", warningDays: "Предупреждать за, дней", automaticCleanupEnabled: "Автоочистка", enabled: "Включено", source: "Источник",
};

export function translateAuditValue(value: string | number | boolean) {
  return typeof value === "string" ? valueLabels[value] ?? (/^[A-Z][A-Z0-9_]*$/.test(value) ? "Служебное значение" : value) : typeof value === "boolean" ? valueLabels[String(value)] : String(value);
}

export function presentAuditEvent(item: { eventType: string; entityType: string; entityId: string; category: JournalCategory; metadata?: Record<string, string | number | boolean>; source: "AUDIT" | "BUSINESS" }) {
  const requestNumber = item.metadata?.requestNumber;
  const object = requestNumber ? `запрос № ${requestNumber}` : entityLabels[item.entityType] ?? "системный объект";
  const details = Object.entries(item.metadata ?? {}).flatMap(([key, value]) => {
    const label = metadataLabels[key];
    return label ? [`${label}: ${translateAuditValue(value)}`] : [];
  });
  return {
    category: journalCategoryLabels[item.category],
    action: eventLabels[item.eventType] ?? "Зафиксировано системное событие",
    object,
    details,
    source: item.source === "AUDIT" ? "Контрольная запись" : "История проекта",
    technicalId: item.entityId.length > 12 ? `${item.entityId.slice(0, 8)}…` : item.entityId,
  };
}
