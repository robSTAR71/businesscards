import type { Contact, EmailEntry, PhoneEntry } from '../types/contact';

export type DuplicateReason = 'email' | 'phone' | 'name';

export interface DuplicateMatch {
  contact: Contact;
  reason: DuplicateReason;
}

export interface DuplicateCandidate {
  firstName?: string;
  lastName?: string;
  emails: EmailEntry[];
  phones: PhoneEntry[];
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Keeps leading "+" and digits only, so "+49 30 123-45" and "+49301234 5" compare equal. */
function normalizePhone(phone: string): string {
  return phone.replace(/(?!^\+)[^\d]/g, '');
}

function normalizeName(firstName?: string, lastName?: string): string {
  return `${firstName ?? ''} ${lastName ?? ''}`.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Flags contacts already in the store that are likely the same person as `candidate` — an
 * exact email or phone match, or an exact full-name match. Deliberately simple (no fuzzy
 * matching) so it never produces a false positive that blocks a legitimate save.
 */
export function findPotentialDuplicates(
  candidate: DuplicateCandidate,
  existingContacts: Contact[],
  excludeId?: string
): DuplicateMatch[] {
  const candidateEmails = new Set(candidate.emails.map((e) => normalizeEmail(e.address)).filter(Boolean));
  const candidatePhones = new Set(candidate.phones.map((p) => normalizePhone(p.number)).filter(Boolean));
  const candidateName = normalizeName(candidate.firstName, candidate.lastName);

  const matches: DuplicateMatch[] = [];

  for (const existing of existingContacts) {
    if (existing.id === excludeId) continue;

    if (existing.emails.some((e) => candidateEmails.has(normalizeEmail(e.address)))) {
      matches.push({ contact: existing, reason: 'email' });
      continue;
    }

    if (existing.phones.some((p) => candidatePhones.has(normalizePhone(p.number)))) {
      matches.push({ contact: existing, reason: 'phone' });
      continue;
    }

    const existingName = normalizeName(existing.firstName, existing.lastName);
    if (candidateName && existingName && candidateName === existingName) {
      matches.push({ contact: existing, reason: 'name' });
    }
  }

  return matches;
}
