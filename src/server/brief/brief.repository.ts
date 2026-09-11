import type {
  BriefRequest,
  Prisma,
  PrismaClient,
} from "@/generated/prisma/client";
import { BriefConflict } from "./brief.receipt";
import { prisma } from "@/server/db/prisma";
import { getSystemSettings } from "@/server/system/settings";
import { enqueueForActiveAdmins } from "@/server/notifications/service";

export class BriefStatusConflict extends Error {}

export type CreateBriefRequestData = {
  name: string;
  contact: string;
  projectType: string;
  answers: Prisma.InputJsonValue;
  source?: string;
  receiptHash?: string;
};

export class BriefRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async findManyForAdmin() {
    return this.db.briefRequest.findMany({
      select: {
        project: { select: { id: true, title: true } },
        id: true,
        number: true,
        name: true,
        contact: true,
        projectType: true,
        source: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async findByIdForAdmin(id: string) {
    return this.db.briefRequest.findUnique({ where: { id }, include: { project: { select: { id: true, title: true } } } });
  }

  async findEventsForAdmin(id: string) {
    return this.db.auditEvent.findMany({
      where: { entityType: "BriefRequest", entityId: id },
      select: { id: true, eventType: true, metadata: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async changeStatus(id: string, newStatus: BriefRequest["status"]) {
    if (newStatus === "IN_PROGRESS") throw new BriefStatusConflict("Используйте создание проекта из заявки.");
    const settings = await getSystemSettings();
    return this.db.$transaction(async (transaction) => {
      const current = await transaction.briefRequest.findUnique({ where: { id }, select: { status: true } });
      if (!current) return null;
      if (current.status === newStatus) return { status: current.status, changed: false };

      const updated = await transaction.briefRequest.updateMany({
        where: { id, status: current.status },
        data: newStatus === "ARCHIVED"
          ? { status: newStatus, archivedAt: new Date(), deleteAfter: new Date(Date.now() + settings.archivedBriefRetentionDays * 86_400_000) }
          : { status: newStatus, archivedAt: null, deleteAfter: null },
      });
      if (updated.count !== 1) throw new BriefStatusConflict("STATUS_CHANGED_CONCURRENTLY");

      await transaction.auditEvent.create({
        data: {
          eventType: "BRIEF_STATUS_CHANGED",
          entityType: "BriefRequest",
          entityId: id,
          metadata: { previousStatus: current.status, newStatus, actor: "ADMIN" },
        },
      });

      return { status: newStatus, changed: true };
    });
  }

  async findByReceipt(receiptHash: string) {
    const event = await this.db.auditEvent.findFirst({
      where: { eventType: 'BRIEF_CREATED', entityType: 'BriefRequest', metadata: { path: ['receiptHash'], equals: receiptHash } },
    });
    return event ? this.db.briefRequest.findUnique({ where: { id: event.entityId } }) : null;
  }

  async replace(previous: BriefRequest, data: CreateBriefRequestData) {
    return this.db.$transaction(async (transaction) => {
      const updated = await transaction.briefRequest.updateMany({
        where: { id: previous.id, status: 'NEW', source: 'PUBLIC_BRIEF', updatedAt: previous.updatedAt },
        data: { name: data.name, contact: data.contact, projectType: data.projectType, answers: data.answers },
      });
      if (updated.count !== 1) throw new BriefConflict('REPLACEMENT_UNAVAILABLE');
      await transaction.auditEvent.create({ data: {
        eventType: 'BRIEF_UPDATED', entityType: 'BriefRequest', entityId: previous.id,
        metadata: { source: 'PUBLIC_BRIEF' },
      } });
      return transaction.briefRequest.findUniqueOrThrow({ where: { id: previous.id } });
    });
  }

  async create(data: CreateBriefRequestData): Promise<BriefRequest> {
    return this.db.$transaction(async (transaction) => {
      const briefRequest = await transaction.briefRequest.create({
        data: {
          name: data.name,
          contact: data.contact,
          projectType: data.projectType,
          answers: data.answers,
          source: data.source,
        },
      });

      await transaction.auditEvent.create({
        data: {
          eventType: "BRIEF_CREATED",
          entityType: "BriefRequest",
          entityId: briefRequest.id,
          metadata: {
            source: briefRequest.source,
            ...(data.receiptHash ? { receiptHash: data.receiptHash } : {}),
          },
        },
      });

      await enqueueForActiveAdmins(transaction, {
        eventType: "BRIEF_CREATED",
        title: "Поступила новая заявка",
        message: `Заявка № ${briefRequest.number} от ${briefRequest.name}.`,
        href: `/admin/briefs/${briefRequest.id}`,
      });

      return briefRequest;
    });
  }
}

export const briefRepository = new BriefRepository();
