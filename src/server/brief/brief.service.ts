import type { SubmitBriefPayload } from './brief.schema';
import { BriefConflict, briefNumber, createBriefReceipt, hashBriefReceipt, normalizeBriefContact } from './brief.receipt';
import type { BriefRequest, Prisma } from "@/generated/prisma/client";
import {
  briefRepository,
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
}

export const briefService = new BriefService();
