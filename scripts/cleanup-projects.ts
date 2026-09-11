import { prisma } from "../src/server/db/prisma";
import { cleanupCandidates } from "../src/server/storage/lifecycle";
import { cleanupExpiredPrivacyReceipts } from "../src/server/privacy/requests";

async function main() {
  try {
    const privacy = await cleanupExpiredPrivacyReceipts();
    const candidates = await cleanupCandidates();
    console.log(`Истёкших privacy-квитанций очищено: ${privacy.receipts}.`);
    console.log(`Кандидатов на контролируемую очистку: ${candidates.length}. Автоматическое удаление не выполнялось.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error("Не удалось очистить архив проектов:", error instanceof Error ? error.message : "Неизвестная ошибка");
  process.exitCode = 1;
});
