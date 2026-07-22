import type { AddressEntry, EmailEntry, NewContact, PhoneEntry } from '../types/contact';

export type OcrContactData = Partial<
  Pick<
    NewContact,
    'firstName' | 'lastName' | 'organization' | 'jobTitle' | 'phones' | 'emails' | 'addresses' | 'website' | 'notes'
  >
>;

export interface CardVisionService {
  extractContact(params: { base64Image: string; mediaType: 'image/jpeg' | 'image/png' }): Promise<OcrContactData>;
}

export class MissingOcrConfigError extends Error {
  constructor() {
    super(
      'Kein OCR-Endpunkt konfiguriert. Setze EXPO_PUBLIC_OCR_ENDPOINT in .env auf die URL deines ' +
        'OCR-Backends (siehe server/ocr-worker/README.md).'
    );
    this.name = 'MissingOcrConfigError';
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function asPhoneEntries(value: unknown): PhoneEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => ({
      label: asString(entry?.label) ?? 'other',
      number: asString(entry?.number) ?? '',
    }))
    .filter((entry) => entry.number.length > 0);
}

function asEmailEntries(value: unknown): EmailEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => ({
      label: asString(entry?.label) ?? 'other',
      address: asString(entry?.address) ?? '',
    }))
    .filter((entry) => entry.address.length > 0);
}

function asAddressEntries(value: unknown): AddressEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => ({
      label: asString(entry?.label) ?? 'other',
      street: asString(entry?.street),
      city: asString(entry?.city),
      postalCode: asString(entry?.postalCode),
      country: asString(entry?.country),
    }))
    .filter((entry) => entry.street || entry.city || entry.postalCode || entry.country);
}

/** Defensively converts the OCR backend's JSON response into our contact shape, ignoring anything malformed. */
export function normalizeOcrResponse(json: unknown): OcrContactData {
  if (typeof json !== 'object' || json === null) {
    return {};
  }
  const raw = json as Record<string, unknown>;

  const result: OcrContactData = {
    firstName: asString(raw.firstName),
    lastName: asString(raw.lastName),
    organization: asString(raw.organization),
    jobTitle: asString(raw.jobTitle),
    website: asString(raw.website),
    notes: asString(raw.notes),
  };

  const phones = asPhoneEntries(raw.phones);
  const emails = asEmailEntries(raw.emails);
  const addresses = asAddressEntries(raw.addresses);
  if (phones.length > 0) result.phones = phones;
  if (emails.length > 0) result.emails = emails;
  if (addresses.length > 0) result.addresses = addresses;

  return result;
}

/**
 * Calls a small server-side proxy (see server/ocr-worker) rather than the vision API directly.
 * A mobile app bundle can be decompiled, so the Anthropic API key must never live in client code —
 * the proxy holds the key and does the actual vision call.
 */
export class RemoteOcrService implements CardVisionService {
  constructor(private readonly endpoint: string) {}

  async extractContact({
    base64Image,
    mediaType,
  }: {
    base64Image: string;
    mediaType: 'image/jpeg' | 'image/png';
  }): Promise<OcrContactData> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image, mediaType }),
    });

    if (!response.ok) {
      throw new Error(`OCR-Dienst antwortete mit Status ${response.status}`);
    }

    const json = await response.json();
    return normalizeOcrResponse(json);
  }
}

export function createOcrService(): CardVisionService {
  const endpoint = process.env.EXPO_PUBLIC_OCR_ENDPOINT;
  if (!endpoint) {
    throw new MissingOcrConfigError();
  }
  return new RemoteOcrService(endpoint);
}
