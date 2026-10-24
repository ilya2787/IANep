import { prisma } from "../src/server/db/prisma";
import { cleanupCandidates } from "../src/server/storage/lifecycle";
import { cleanupExpiredPrivacyReceipts } from "../src/server/privacy/requests";
import { cleanupExpiredAnalyticsConsent } from "../src/server/privacy/analytics-consent";
import { briefRateLimiter } from "../src/server/brief/brief-rate-limit";

async function main() {
  try {
    const [privacy, rateLimit, analytics] = await Promise.all([cleanupExpiredPrivacyReceipts(), briefRateLimiter.cleanupExpired(), cleanupExpiredAnalyticsConsent()]);
    const candidates = await cleanupCandidates();
    console.log(`Истёкших privacy-квитанций очищено: ${privacy.receipts}.`);
    console.log(`Истёкших записей выбора аналитики очищено: ${analytics.count}.`);
    console.log(`Истёкших записей ограничения Brief очищено: ${rateLimit.count}.`);
    console.log(`Кандидатов на контролируемую очистку: ${candidates.length}. Автоматическое удаление не выполнялось.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error("Не удалось очистить архив проектов:", error instanceof Error ? error.message : "Неизвестная ошибка");
  process.exitCode = 1;
});
