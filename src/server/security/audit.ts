import { createHash } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { operationalError } from "@/server/operations/log";

export async function securityAudit(eventType: string, entityType: string, entityId: string, metadata?: Record<string, string | number | boolean>) {
  await prisma.auditEvent.create({ data: { eventType, entityType, entityId: createHash("sha256").update(entityId).digest("hex"), metadata } }).catch(error => {
    operationalError("security.audit.write_failed", error, { auditEventType: eventType, entityType });
  });
}
