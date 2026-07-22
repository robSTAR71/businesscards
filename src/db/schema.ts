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
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
`;
