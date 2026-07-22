export const CREATE_CONTACTS_TABLE = `
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY NOT NULL,
  firstName TEXT,
  lastName TEXT,
  organization TEXT,
  jobTitle TEXT,
  phones TEXT NOT NULL DEFAULT '[]',
  emails TEXT NOT NULL DEFAULT '[]',
  addresses TEXT NOT NULL DEFAULT '[]',
  website TEXT,
  notes TEXT,
  contextLabel TEXT NOT NULL DEFAULT 'beruflich',
  tags TEXT NOT NULL DEFAULT '[]',
  photoFrontUri TEXT,
  photoBackUri TEXT,
  fieldSources TEXT NOT NULL DEFAULT '{}',
  deviceContactId TEXT,
  googleResourceName TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
`;

/**
 * Columns added after the initial release. New installs already get them via
 * CREATE_CONTACTS_TABLE above; this lets an existing local dev database (created before this
 * migration existed) catch up without losing its data. Each statement is applied individually
 * so "duplicate column" failures for already-migrated columns can be ignored one at a time.
 */
export const COLUMN_MIGRATIONS: string[] = [
  `ALTER TABLE contacts ADD COLUMN deviceContactId TEXT;`,
  `ALTER TABLE contacts ADD COLUMN googleResourceName TEXT;`,
];
