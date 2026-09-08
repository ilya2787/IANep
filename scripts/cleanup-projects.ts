import { prisma } from "../src/server/db/prisma";
import { cleanupCandidates } from "../src/server/storage/lifecycle";

async function main() {
  try {
    const candidates = await cleanupCandidates();
    console.log(`Кандидатов на контролируемую очистку: ${candidates.length}. Автоматическое удаление не выполнялось.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error("Не удалось очистить архив проектов:", error instanceof Error ? error.message : "Неизвестная ошибка");
  process.exitCode = 1;
});
