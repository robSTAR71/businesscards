export type ContextLabel = 'beruflich' | 'privat' | 'mischung';

export type FieldSource = 'qr' | 'ocr' | 'manual';

export interface PhoneEntry {
  label: string;
  number: string;
}

export interface EmailEntry {
  label: string;
  address: string;
}

export interface AddressEntry {
  label: string;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface Contact {
  id: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
  jobTitle?: string;
  phones: PhoneEntry[];
  emails: EmailEntry[];
  addresses: AddressEntry[];
  website?: string;
  notes?: string;
  contextLabel: ContextLabel;
  tags: string[];
  photoFrontUri?: string;
  photoBackUri?: string;
  /** Tracks which source produced each top-level field, shown in the review screen. */
  fieldSources: Partial<Record<string, FieldSource>>;
  createdAt: string;
  updatedAt: string;
}

export type NewContact = Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>;
