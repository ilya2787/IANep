import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";

export class AdminRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  findActiveByUsername(username: string) {
    return this.db.adminUser.findFirst({
      where: { username, active: true },
      select: { id: true, username: true, passwordHash: true, sessionVersion: true },
    });
  }

  findActiveById(id: string) {
    return this.db.adminUser.findFirst({
      where: { id, active: true },
      select: { id: true, username: true, sessionVersion: true },
    });
  }

  revokeSessions(id: string) {
    return this.db.adminUser.updateMany({ where: { id }, data: { sessionVersion: { increment: 1 } } });
  }
}

export const adminRepository = new AdminRepository();
