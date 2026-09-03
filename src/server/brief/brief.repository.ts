import type {
  BriefRequest,
  Prisma,
  PrismaClient,
} from "@/generated/prisma/client";
import { BriefConflict } from "./brief.receipt";
import { prisma } from "@/server/db/prisma";

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

      return briefRequest;
    });
  }
}

export const briefRepository = new BriefRepository();
