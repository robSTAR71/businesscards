import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { COLUMN_MIGRATIONS, CREATE_CONTACTS_TABLE } from './schema';
import type { Contact, ContextLabel, NewContact } from '../types/contact';

const DB_NAME = 'businesscards.db';

let db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync(DB_NAME);
    db.execSync(CREATE_CONTACTS_TABLE);
    for (const statement of COLUMN_MIGRATIONS) {
      try {
        db.execSync(statement);
      } catch {
        // Column already exists on a database created before this migration was added.
      }
    }
  }
  return db;
}

/** Call once at app startup so the schema exists before any screen queries it. */
export function initDb(): void {
  getDb();
}

interface ContactRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  organization: string | null;
  jobTitle: string | null;
  phones: string;
  emails: string;
  addresses: string;
  website: string | null;
  notes: string | null;
  contextLabel: ContextLabel;
  tags: string;
  photoFrontUri: string | null;
  photoBackUri: string | null;
  fieldSources: string;
  deviceContactId: string | null;
  googleResourceName: string | null;
  createdAt: string;
  updatedAt: string;
}

function rowToContact(row: ContactRow): Contact {
  return {
    id: row.id,
    firstName: row.firstName ?? undefined,
    lastName: row.lastName ?? undefined,
    organization: row.organization ?? undefined,
    jobTitle: row.jobTitle ?? undefined,
    phones: JSON.parse(row.phones),
    emails: JSON.parse(row.emails),
    addresses: JSON.parse(row.addresses),
    website: row.website ?? undefined,
    notes: row.notes ?? undefined,
    contextLabel: row.contextLabel,
    tags: JSON.parse(row.tags),
    photoFrontUri: row.photoFrontUri ?? undefined,
    photoBackUri: row.photoBackUri ?? undefined,
    fieldSources: JSON.parse(row.fieldSources),
    deviceContactId: row.deviceContactId ?? undefined,
    googleResourceName: row.googleResourceName ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function insertContact(contact: NewContact): Contact {
  const now = new Date().toISOString();
  const full: Contact = {
    ...contact,
    id: Crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };

  getDb().runSync(
    `INSERT INTO contacts
      (id, firstName, lastName, organization, jobTitle, phones, emails, addresses,
       website, notes, contextLabel, tags, photoFrontUri, photoBackUri, fieldSources,
       deviceContactId, googleResourceName, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      full.id,
      full.firstName ?? null,
      full.lastName ?? null,
      full.organization ?? null,
      full.jobTitle ?? null,
      JSON.stringify(full.phones),
      JSON.stringify(full.emails),
      JSON.stringify(full.addresses),
      full.website ?? null,
      full.notes ?? null,
      full.contextLabel,
      JSON.stringify(full.tags),
      full.photoFrontUri ?? null,
      full.photoBackUri ?? null,
      JSON.stringify(full.fieldSources),
      full.deviceContactId ?? null,
      full.googleResourceName ?? null,
      full.createdAt,
      full.updatedAt,
    ]
  );

  return full;
}

export function updateContact(contact: Contact): Contact {
  const updated: Contact = { ...contact, updatedAt: new Date().toISOString() };

  getDb().runSync(
    `UPDATE contacts SET
      firstName = ?, lastName = ?, organization = ?, jobTitle = ?, phones = ?, emails = ?,
      addresses = ?, website = ?, notes = ?, contextLabel = ?, tags = ?, photoFrontUri = ?,
      photoBackUri = ?, fieldSources = ?, deviceContactId = ?, googleResourceName = ?, updatedAt = ?
     WHERE id = ?`,
    [
      updated.firstName ?? null,
      updated.lastName ?? null,
      updated.organization ?? null,
      updated.jobTitle ?? null,
      JSON.stringify(updated.phones),
      JSON.stringify(updated.emails),
      JSON.stringify(updated.addresses),
      updated.website ?? null,
      updated.notes ?? null,
      updated.contextLabel,
      JSON.stringify(updated.tags),
      updated.photoFrontUri ?? null,
      updated.photoBackUri ?? null,
      JSON.stringify(updated.fieldSources),
      updated.deviceContactId ?? null,
      updated.googleResourceName ?? null,
      updated.updatedAt,
      updated.id,
    ]
  );

  return updated;
}

export function deleteContact(id: string): void {
  getDb().runSync(`DELETE FROM contacts WHERE id = ?`, [id]);
}

export function getContact(id: string): Contact | null {
  const row = getDb().getFirstSync<ContactRow>(`SELECT * FROM contacts WHERE id = ?`, [id]);
  return row ? rowToContact(row) : null;
}

export interface ContactFilter {
  contextLabel?: ContextLabel;
  tag?: string;
}

export function listContacts(filter: ContactFilter = {}): Contact[] {
  let query = `SELECT * FROM contacts`;
  const params: string[] = [];
  const conditions: string[] = [];

  if (filter.contextLabel) {
    conditions.push(`contextLabel = ?`);
    params.push(filter.contextLabel);
  }
  if (filter.tag) {
    conditions.push(`tags LIKE ?`);
    params.push(`%"${filter.tag}"%`);
  }
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  query += ` ORDER BY updatedAt DESC`;

  const rows = getDb().getAllSync<ContactRow>(query, params);
  return rows.map(rowToContact);
}
