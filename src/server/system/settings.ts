import { prisma } from "@/server/db/prisma";

export const DEFAULT_SETTINGS_ID = "default";

export async function getSystemSettings() {
  return prisma.systemSetting.upsert({
    where: { id: DEFAULT_SETTINGS_ID },
    update: {},
    create: { id: DEFAULT_SETTINGS_ID },
  });
}
