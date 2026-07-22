import type { ContextLabel, EmailEntry } from '../types/contact';

/** Common consumer/free email domains — seeing one of these hints at a private rather than corporate contact. */
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'gmx.de',
  'gmx.net',
  'gmx.at',
  'gmx.ch',
  'web.de',
  't-online.de',
  'yahoo.com',
  'yahoo.de',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'icloud.com',
  'me.com',
  'aol.com',
  'mail.com',
  'protonmail.com',
  'freenet.de',
]);

function extractDomain(email: string): string | undefined {
  return email.split('@')[1]?.toLowerCase().trim();
}

/**
 * Suggests a default label for the review screen. A business card is "beruflich" by
 * default; the suggestion only shifts to "mischung"/"privat" when the extracted emails
 * point at a personal mailbox rather than a corporate one.
 */
export function suggestContextLabel(input: { organization?: string; emails: EmailEntry[] }): ContextLabel {
  if (input.emails.length === 0) {
    return 'beruflich';
  }

  const domains = input.emails.map((entry) => extractDomain(entry.address)).filter((d): d is string => Boolean(d));
  if (domains.length === 0) {
    return 'beruflich';
  }

  const freeDomainCount = domains.filter((d) => FREE_EMAIL_DOMAINS.has(d)).length;

  if (freeDomainCount === 0) {
    return 'beruflich';
  }
  if (freeDomainCount === domains.length) {
    return input.organization ? 'mischung' : 'privat';
  }
  return 'mischung';
}
