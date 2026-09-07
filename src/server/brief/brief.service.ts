import type { SubmitBriefPayload } from './brief.schema';
import { BriefConflict, briefNumber, createBriefReceipt, hashBriefReceipt, normalizeBriefContact } from './brief.receipt';
import type { BriefRequest, Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/server/auth/admin-auth";
import { z } from "zod";
import {
  briefRepository,
  BriefStatusConflict,
  type BriefRepository,
} from "@/server/brief/brief.repository";

export type SubmitBriefInput = {
  name: string;
  contact: string;
  projectType: string;
  answers: Prisma.InputJsonValue;
  source?: string;
};

export class BriefService {
  constructor(private readonly repository: BriefRepository = briefRepository) {}

  async submitPublic(input: SubmitBriefPayload, options: { receipt?: string; action?: 'new' | 'replace' } = {}) {
    const previous = options.receipt ? await this.repository.findByReceipt(hashBriefReceipt(options.receipt)) : null;
    const previousAnswers = previous?.answers as { contactMethod?: string } | undefined;
    const matches = previous && previous.source === 'PUBLIC_BRIEF'
      && previousAnswers?.contactMethod === input.answers.contactMethod
      && normalizeBriefContact(previous.contact, input.answers.contactMethod) === normalizeBriefContact(input.contact, input.answers.contactMethod);
    if (options.action === 'replace') {
      if (!matches || previous.status !== 'NEW') throw new BriefConflict('REPLACEMENT_UNAVAILABLE');
      const request = await this.repository.replace(previous, input);
      return { request, receipt: options.receipt!, replaced: true };
    }
    if (matches && options.action !== 'new') {
      throw new BriefConflict('DUPLICATE_BRIEF', briefNumber(previous.number), previous.status === 'NEW');
    }
    const receipt = createBriefReceipt();
    const request = await this.repository.create({ ...input, source: 'PUBLIC_BRIEF', receiptHash: hashBriefReceipt(receipt) });
    return { request, receipt, replaced: false };
  }

  async submit(input: SubmitBriefInput): Promise<BriefRequest> {
    return this.repository.create({ ...input, source: input.source ?? "PUBLIC_BRIEF" });
  }

  async listForAdmin() {
    await requireAdmin();
    return this.repository.findManyForAdmin();
  }

  async getForAdmin(id: string) {
    await requireAdmin();
    if (!z.uuid().safeParse(id).success) return null;
    return this.repository.findByIdForAdmin(id);
  }

  async getHistoryForAdmin(id: string) {
    await requireAdmin();
    if (!z.uuid().safeParse(id).success) return [];
    const events = await this.repository.findEventsForAdmin(id);

    return events.map((event) => {
      const metadata = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
        ? event.metadata as Record<string, unknown>
        : {};
      return {
        id: event.id,
        eventType: event.eventType,
        createdAt: event.createdAt,
        previousStatus: typeof metadata.previousStatus === "string" ? metadata.previousStatus : null,
        newStatus: typeof metadata.newStatus === "string" ? metadata.newStatus : null,
        source: typeof metadata.source === "string" ? metadata.source : null,
      };
    });
  }

  async changeStatusForAdmin(id: string, status: unknown) {
    await requireAdmin();
    const input = z.object({ id: z.uuid(), status: z.enum(["NEW", "IN_REVIEW", "CONTACTED", "ARCHIVED"]) }).safeParse({ id, status });
    if (!input.success) return { ok: false as const, reason: "INVALID" as const };
    try {
      const result = await this.repository.changeStatus(input.data.id, input.data.status);
      return result ? { ok: true as const, ...result } : { ok: false as const, reason: "NOT_FOUND" as const };
    } catch (error) {
      if (error instanceof BriefStatusConflict) return { ok: false as const, reason: "CONFLICT" as const };
      throw error;
    }
  }
}

export const briefService = new BriefService();
