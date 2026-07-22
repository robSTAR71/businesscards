import type { Contact } from '../types/contact';

function escapeVCardValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function labelToType(label: string): string {
  return label.toUpperCase();
}

/**
 * Serializes a single contact as vCard 3.0. CATEGORIES carries the context label and
 * tags so they survive export into Google Contacts / iOS Contacts as labels/groups.
 */
export function contactToVCard(contact: Contact): string {
  const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0'];

  const lastName = contact.lastName ?? '';
  const firstName = contact.firstName ?? '';
  lines.push(`N:${escapeVCardValue(lastName)};${escapeVCardValue(firstName)};;;`);

  const fullName = [firstName, lastName].filter(Boolean).join(' ') || contact.organization || 'Unbekannt';
  lines.push(`FN:${escapeVCardValue(fullName)}`);

  if (contact.organization) {
    lines.push(`ORG:${escapeVCardValue(contact.organization)}`);
  }
  if (contact.jobTitle) {
    lines.push(`TITLE:${escapeVCardValue(contact.jobTitle)}`);
  }
  for (const phone of contact.phones) {
    lines.push(`TEL;TYPE=${labelToType(phone.label)}:${escapeVCardValue(phone.number)}`);
  }
  for (const email of contact.emails) {
    lines.push(`EMAIL;TYPE=${labelToType(email.label)}:${escapeVCardValue(email.address)}`);
  }
  for (const address of contact.addresses) {
    const parts = ['', '', address.street ?? '', address.city ?? '', '', address.postalCode ?? '', address.country ?? ''];
    lines.push(`ADR;TYPE=${labelToType(address.label)}:${parts.map(escapeVCardValue).join(';')}`);
  }
  if (contact.website) {
    lines.push(`URL:${escapeVCardValue(contact.website)}`);
  }
  if (contact.notes) {
    lines.push(`NOTE:${escapeVCardValue(contact.notes)}`);
  }

  const categories = [contact.contextLabel, ...contact.tags];
  if (categories.length > 0) {
    lines.push(`CATEGORIES:${categories.map(escapeVCardValue).join(',')}`);
  }

  lines.push('END:VCARD');
  return lines.join('\r\n');
}

/** Bulk export for backups: concatenates every contact into one .vcf file (standard behavior for multi-contact vCard files). */
export function contactsToVCard(contacts: Contact[]): string {
  return contacts.map(contactToVCard).join('\r\n');
}
