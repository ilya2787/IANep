import { prisma } from "../src/server/db/prisma";
import { storageSummary } from "../src/server/storage/lifecycle";
async function main() {
try {
  const summary = await storageSummary();
  console.log(`Orphan/temp файлов: ${summary.orphanFiles}. Объём: ${summary.orphanBytes} байт. Автоматическое удаление не выполнялось.`);
} finally { await prisma.$disconnect(); }

}
main().catch(error => { console.error("Не удалось очистить хранилище:", error instanceof Error ? error.message : "Неизвестная ошибка"); process.exitCode = 1; });
