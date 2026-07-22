import type { Contact, ContextLabel } from '../types/contact';
import { contactToGooglePerson, type GooglePersonPayload } from './googlePeoplePayload';

const PEOPLE_API_BASE = 'https://people.googleapis.com/v1';
const PERSON_FIELDS = 'names,organizations,phoneNumbers,emailAddresses,addresses,urls,biographies,memberships';

/** Google Contacts label per app context — same wording the Review screen shows, so it reads as one system across both apps. */
const CONTEXT_GROUP_NAMES: Record<ContextLabel, string> = {
  beruflich: 'Beruflich',
  privat: 'Privat',
  mischung: 'Bi',
};

async function peopleApiFetch(accessToken: string, path: string, init?: RequestInit): Promise<any> {
  const response = await fetch(`${PEOPLE_API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google People API Fehler (${response.status}): ${body}`);
  }

  return response.json();
}

/** Looks up an existing Google Contacts label by name, creating it on first use. */
export async function findOrCreateContactGroup(accessToken: string, name: string): Promise<string> {
  const list = await peopleApiFetch(accessToken, '/contactGroups?pageSize=200');
  const existing = (list.contactGroups ?? []).find((group: { name?: string }) => group.name === name);
  if (existing) {
    return existing.resourceName;
  }

  const created = await peopleApiFetch(accessToken, '/contactGroups', {
    method: 'POST',
    body: JSON.stringify({ contactGroup: { name } }),
  });
  return created.resourceName;
}

export async function createGoogleContact(
  accessToken: string,
  payload: GooglePersonPayload
): Promise<{ resourceName: string; etag: string }> {
  return peopleApiFetch(accessToken, `/people:createContact?personFields=${PERSON_FIELDS}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function getGoogleContactEtag(accessToken: string, resourceName: string): Promise<string> {
  const person = await peopleApiFetch(accessToken, `/${resourceName}?personFields=metadata`);
  return person.etag;
}

export async function updateGoogleContact(
  accessToken: string,
  resourceName: string,
  payload: GooglePersonPayload
): Promise<{ resourceName: string; etag: string }> {
  // The People API requires the current etag on every update (optimistic concurrency control).
  const etag = await getGoogleContactEtag(accessToken, resourceName);
  return peopleApiFetch(accessToken, `/${resourceName}:updateContact?updatePersonFields=${PERSON_FIELDS}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...payload, etag }),
  });
}

/**
 * Creates or updates this contact in Google Contacts, keeping it in the label matching its
 * beruflich/privat/bi context. Reuses `contact.googleResourceName` from a previous sync so
 * re-syncing updates the same Google contact instead of creating a duplicate.
 */
export async function syncContactToGoogle(accessToken: string, contact: Contact): Promise<{ resourceName: string }> {
  const groupResourceName = await findOrCreateContactGroup(accessToken, CONTEXT_GROUP_NAMES[contact.contextLabel]);
  const payload = contactToGooglePerson(contact, groupResourceName);

  if (contact.googleResourceName) {
    try {
      const updated = await updateGoogleContact(accessToken, contact.googleResourceName, payload);
      return { resourceName: updated.resourceName };
    } catch {
      // The stored resourceName may point at a contact deleted on Google's side since the last sync.
    }
  }

  const created = await createGoogleContact(accessToken, payload);
  return { resourceName: created.resourceName };
}
