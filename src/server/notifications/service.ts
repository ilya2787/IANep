import nodemailer from "nodemailer";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { smtpEnvironment } from "@/server/config/env";
import { operationalError } from "@/server/operations/log";
import { notificationRetryDelayMs } from "@/server/notifications/retry";
import { notificationEmail } from "@/server/notifications/email-template";

export type NotificationRecipient = { clientId: string } | { adminId: string };
export type NotificationEvent = {
  recipient: NotificationRecipient;
  projectId?: string;
  eventType: string;
  title: string;
  message: string;
  href?: string;
  email?: boolean;
};

export async function enqueueNotification(tx: Prisma.TransactionClient, input: NotificationEvent) {
  const emailEnabled = input.email && "clientId" in input.recipient
    ? Boolean((await tx.clientUser.findUnique({ where: { id: input.recipient.clientId }, select: { email: true, emailNotificationsEnabled: true } }))?.emailNotificationsEnabled)
    : false;
  const notification = await tx.notification.create({
    data: {
      ...( "clientId" in input.recipient ? { recipientClientId: input.recipient.clientId } : { recipientAdminId: input.recipient.adminId }),
      projectId: input.projectId,
      eventType: input.eventType,
      title: input.title,
      message: input.message,
      href: input.href,
      attempts: {
        create: [
          { channel: "IN_APP", status: "DELIVERED", attemptCount: 1, sentAt: new Date(), deliveredAt: new Date() },
          ...(emailEnabled ? [{ channel: "EMAIL" as const, status: "PENDING" as const }] : []),
        ],
      },
    },
  });
  return notification.id;
}

export async function enqueueForActiveAdmins(tx: Prisma.TransactionClient, input: Omit<NotificationEvent, "recipient">) {
  const admins = await tx.adminUser.findMany({ where: { active: true }, select: { id: true } });
  await Promise.all(admins.map(admin => enqueueNotification(tx, { ...input, recipient: { adminId: admin.id }, email: false })));
}

export async function dispatchPendingNotifications(limit = 20) {
  const smtp = smtpEnvironment();
  if (!smtp) return { disabled: true, processed: 0, sent: 0, failed: 0, skipped: 0 };
  const now = new Date();
  const attempts = await prisma.notificationAttempt.findMany({
    where: { channel: "EMAIL", status: { in: ["PENDING", "FAILED"] }, nextAttemptAt: { lte: now }, attemptCount: { lt: 5 } },
    include: { notification: { include: { recipientClient: { select: { email: true, active: true, emailNotificationsEnabled: true } } } } },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  const result = { disabled: false, processed: 0, sent: 0, failed: 0, skipped: 0 };
  for (const attempt of attempts) {
    const claimed = await prisma.notificationAttempt.updateMany({
      where: { id: attempt.id, status: { in: ["PENDING", "FAILED"] }, nextAttemptAt: { lte: now }, attemptCount: attempt.attemptCount },
      data: { nextAttemptAt: new Date(Date.now() + 10 * 60_000) },
    });
    if (!claimed.count) continue;
    result.processed += 1;
    const recipient = attempt.notification.recipientClient;
    const email = recipient?.active && recipient.emailNotificationsEnabled ? recipient.email : null;
    if (!email) {
      await prisma.notificationAttempt.update({ where: { id: attempt.id }, data: { status: "SKIPPED", attemptCount: { increment: 1 }, lastError: recipient && !recipient.emailNotificationsEnabled ? "EMAIL_PREFERENCE_DISABLED" : "RECIPIENT_EMAIL_UNAVAILABLE" } });
      result.skipped += 1;
      continue;
    }
    try {
      const content = notificationEmail(attempt.notification);
      await nodemailer.createTransport(smtp.transport).sendMail({ from: smtp.from, replyTo: smtp.replyTo, to: email, ...content });
      await prisma.notificationAttempt.update({ where: { id: attempt.id }, data: { status: "SENT", sentAt: new Date(), attemptCount: { increment: 1 }, lastError: null } });
      result.sent += 1;
    } catch (error) {
      const count = attempt.attemptCount + 1;
      await prisma.notificationAttempt.update({ where: { id: attempt.id }, data: { status: "FAILED", attemptCount: count, nextAttemptAt: new Date(Date.now() + notificationRetryDelayMs(count)), lastError: error instanceof Error ? error.message.slice(0, 500) : "SMTP_ERROR" } });
      operationalError("notification.email.failed", error, { attemptId: attempt.id, attemptCount: count });
      result.failed += 1;
    }
  }
  return result;
}

export async function listNotifications(recipient: NotificationRecipient, limit = 50) {
  const where = "clientId" in recipient ? { recipientClientId: recipient.clientId } : { recipientAdminId: recipient.adminId };
  return prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, include: { attempts: true } });
}

export async function unreadCount(recipient: NotificationRecipient) {
  const where = "clientId" in recipient ? { recipientClientId: recipient.clientId } : { recipientAdminId: recipient.adminId };
  return prisma.notification.count({ where: { ...where, readAt: null } });
}

export async function markNotificationRead(recipient: NotificationRecipient, id?: string) {
  const owner = "clientId" in recipient ? { recipientClientId: recipient.clientId } : { recipientAdminId: recipient.adminId };
  return prisma.notification.updateMany({ where: { ...owner, readAt: null, ...(id ? { id } : {}) }, data: { readAt: new Date() } });
}
