import { createHash, randomBytes } from 'node:crypto';
import { normalizeEmail, normalizeRussianPhone } from '@/server/contact/normalization';

export function createBriefReceipt() {
  return randomBytes(32).toString('hex');
}

export function hashBriefReceipt(receipt: string) {
  return createHash('sha256').update(receipt).digest('hex');
}

export function normalizeBriefContact(contact: string, method: string) {
  if (method === 'Телефон') return normalizeRussianPhone(contact);
  if (method === 'Email') return normalizeEmail(contact);
  return contact.normalize('NFKC').trim().toLowerCase();
}

export function briefNumber(number: number) {
  return `IAN-${String(number).padStart(6, '0')}`;
}

export class BriefConflict extends Error {
  constructor(public readonly code: 'DUPLICATE_BRIEF' | 'REPLACEMENT_UNAVAILABLE', public readonly number?: string, public readonly canReplace = false) {
    super(code);
  }
}
