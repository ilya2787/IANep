import { dispatchPendingNotifications } from "@/server/notifications/service";
import { prisma } from "@/server/db/prisma";

async function main() {
  const result = await dispatchPendingNotifications(Number(process.env.NOTIFICATION_DISPATCH_LIMIT || "50"));
  console.log(JSON.stringify({ event: "notification.dispatch.completed", ...result }));
}

main()
  .catch(error => {
    console.error(JSON.stringify({ event: "notification.dispatch.failed", errorType: error instanceof Error ? error.name : "UnknownError" }));
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
