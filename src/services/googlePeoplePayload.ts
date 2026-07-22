import type { Contact } from '../types/contact';

export interface GooglePersonPayload {
  names?: { givenName?: string; familyName?: string }[];
  organizations?: { name?: string; title?: string }[];
  phoneNumbers?: { value: string; type?: string }[];
  emailAddresses?: { value: string; type?: string }[];
  addresses?: { streetAddress?: string; city?: string; postalCode?: string; country?: string; type?: string }[];
  urls?: { value: string; type?: string }[];
  biographies?: { value: string; contentType: 'TEXT_PLAIN' }[];
  memberships?: { contactGroupMembership: { contactGroupResourceName: string } }[];
}

/**
 * Maps our Contact model to a Google People API `Person` request body. `contextGroupResourceName`
 * (resolved separately via the contactGroups API) puts the contact in a Google Contacts label
 * matching its beruflich/privat/bi context, so the grouping survives outside this app too.
 */
export function contactToGooglePerson(contact: Contact, contextGroupResourceName?: string): GooglePersonPayload {
  const payload: GooglePersonPayload = {};

  if (contact.firstName || contact.lastName) {
    payload.names = [{ givenName: contact.firstName, familyName: contact.lastName }];
  }
  if (contact.organization || contact.jobTitle) {
    payload.organizations = [{ name: contact.organization, title: contact.jobTitle }];
  }
  if (contact.phones.length > 0) {
    payload.phoneNumbers = contact.phones.map((p) => ({ value: p.number, type: p.label }));
  }
  if (contact.emails.length > 0) {
    payload.emailAddresses = contact.emails.map((e) => ({ value: e.address, type: e.label }));
  }
  if (contact.addresses.length > 0) {
    payload.addresses = contact.addresses.map((a) => ({
      streetAddress: a.street,
      city: a.city,
      postalCode: a.postalCode,
      country: a.country,
      type: a.label,
    }));
  }
  if (contact.website) {
    payload.urls = [{ value: contact.website, type: 'work' }];
  }

  const bioParts = [
    contact.notes,
    contact.tags.length > 0 ? `Tags: ${contact.tags.join(', ')}` : undefined,
  ].filter((part): part is string => Boolean(part));
  if (bioParts.length > 0) {
    payload.biographies = [{ value: bioParts.join('\n'), contentType: 'TEXT_PLAIN' }];
  }

  if (contextGroupResourceName) {
    payload.memberships = [{ contactGroupMembership: { contactGroupResourceName: contextGroupResourceName } }];
  }

  return payload;
}
