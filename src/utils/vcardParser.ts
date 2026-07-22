import type { AddressEntry, EmailEntry, NewContact, PhoneEntry } from '../types/contact';

type ParsedContact = Partial<
  Pick<
    NewContact,
    'firstName' | 'lastName' | 'organization' | 'jobTitle' | 'phones' | 'emails' | 'addresses' | 'website' | 'notes'
  >
>;

function unescapeVCardValue(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/** Un-fold vCard continuation lines (a line starting with a space/tab belongs to the previous line). */
function toLogicalLines(text: string): string[] {
  const rawLines = text.replace(/\r\n/g, '\n').split('\n');
  const lines: string[] = [];
  for (const raw of rawLines) {
    if ((raw.startsWith(' ') || raw.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += raw.slice(1);
    } else if (raw.trim().length > 0) {
      lines.push(raw);
    }
  }
  return lines;
}

/** Splits "TEL;TYPE=WORK,VOICE:+49 30 1234567" into property name, params, and value. */
function splitLine(line: string): { name: string; params: string[]; value: string } {
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) {
    return { name: line.toUpperCase(), params: [], value: '' };
  }
  const head = line.slice(0, colonIndex);
  const value = line.slice(colonIndex + 1);
  const [name, ...params] = head.split(';');
  return { name: name.toUpperCase(), params, value };
}

function labelFromParams(params: string[], fallback: string): string {
  for (const param of params) {
    const [key, val] = param.split('=');
    if (key?.toUpperCase() === 'TYPE' && val) {
      return val.split(',')[0].toLowerCase();
    }
  }
  return fallback;
}

export function parseVCardText(text: string): ParsedContact | null {
  if (!/BEGIN:VCARD/i.test(text)) {
    return null;
  }

  const result: ParsedContact = {};
  const phones: PhoneEntry[] = [];
  const emails: EmailEntry[] = [];
  const addresses: AddressEntry[] = [];

  for (const line of toLogicalLines(text)) {
    const { name, params, value } = splitLine(line);
    const decoded = unescapeVCardValue(value);

    switch (name) {
      case 'N': {
        const [last, first] = decoded.split(';');
        if (last) result.lastName = last.trim();
        if (first) result.firstName = first.trim();
        break;
      }
      case 'FN': {
        if (!result.firstName && !result.lastName) {
          const parts = decoded.trim().split(/\s+/);
          result.firstName = parts.shift();
          result.lastName = parts.join(' ') || undefined;
        }
        break;
      }
      case 'ORG':
        result.organization = decoded.split(';')[0].trim();
        break;
      case 'TITLE':
        result.jobTitle = decoded.trim();
        break;
      case 'TEL':
        if (decoded.trim()) {
          phones.push({ label: labelFromParams(params, 'other'), number: decoded.trim() });
        }
        break;
      case 'EMAIL':
        if (decoded.trim()) {
          emails.push({ label: labelFromParams(params, 'other'), address: decoded.trim() });
        }
        break;
      case 'ADR': {
        const [, , street, city, , postalCode, country] = decoded.split(';');
        if (street || city || postalCode || country) {
          addresses.push({
            label: labelFromParams(params, 'other'),
            street: street?.trim() || undefined,
            city: city?.trim() || undefined,
            postalCode: postalCode?.trim() || undefined,
            country: country?.trim() || undefined,
          });
        }
        break;
      }
      case 'URL':
        result.website = decoded.trim();
        break;
      case 'NOTE':
        result.notes = decoded.trim();
        break;
      default:
        break;
    }
  }

  if (phones.length > 0) result.phones = phones;
  if (emails.length > 0) result.emails = emails;
  if (addresses.length > 0) result.addresses = addresses;

  return result;
}

/** MeCard is a lighter-weight QR format common on Japanese/Asian business cards, e.g. "MECARD:N:Nachname,Vorname;TEL:+49...;;". */
export function parseMeCardText(text: string): ParsedContact | null {
  if (!/^MECARD:/i.test(text.trim())) {
    return null;
  }

  const body = text.trim().replace(/^MECARD:/i, '').replace(/;;?\s*$/, '');
  const fields = body.split(/(?<!\\);/);

  const result: ParsedContact = {};
  const phones: PhoneEntry[] = [];
  const emails: EmailEntry[] = [];
  const addresses: AddressEntry[] = [];

  for (const field of fields) {
    const separatorIndex = field.indexOf(':');
    if (separatorIndex === -1) continue;
    const key = field.slice(0, separatorIndex).toUpperCase();
    const value = unescapeVCardValue(field.slice(separatorIndex + 1)).trim();
    if (!value) continue;

    switch (key) {
      case 'N': {
        const [last, first] = value.split(',');
        if (last) result.lastName = last.trim();
        if (first) result.firstName = first.trim();
        break;
      }
      case 'ORG':
        result.organization = value;
        break;
      case 'TEL':
        phones.push({ label: 'other', number: value });
        break;
      case 'EMAIL':
        emails.push({ label: 'other', address: value });
        break;
      case 'ADR':
        addresses.push({ label: 'other', street: value });
        break;
      case 'URL':
        result.website = value;
        break;
      case 'NOTE':
        result.notes = value;
        break;
      default:
        break;
    }
  }

  if (phones.length > 0) result.phones = phones;
  if (emails.length > 0) result.emails = emails;
  if (addresses.length > 0) result.addresses = addresses;

  return result;
}

/** Tries every supported QR payload format for business-card contact data. Returns null if the payload isn't recognized. */
export function parseContactQrPayload(text: string): ParsedContact | null {
  return parseVCardText(text) ?? parseMeCardText(text);
}
