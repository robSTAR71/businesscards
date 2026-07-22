import { contactToGooglePerson } from '../googlePeoplePayload';
import type { Contact } from '../../types/contact';

const baseContact: Contact = {
  id: 'abc-123',
  firstName: 'Max',
  lastName: 'Mustermann',
  organization: 'Muster GmbH',
  jobTitle: 'Head of Sales',
  phones: [{ label: 'work', number: '+49 30 1234567' }],
  emails: [{ label: 'work', address: 'max@muster.de' }],
  addresses: [{ label: 'work', street: 'Musterstr. 1', city: 'Berlin', postalCode: '10115', country: 'Deutschland' }],
  website: 'https://muster.de',
  notes: 'Getroffen auf der Konferenz X',
  contextLabel: 'beruflich',
  tags: ['Konferenz X 2026', 'Kunde'],
  fieldSources: {},
  createdAt: '2026-07-20T10:00:00.000Z',
  updatedAt: '2026-07-20T10:00:00.000Z',
};

describe('contactToGooglePerson', () => {
  it('maps name, organization and job title', () => {
    const payload = contactToGooglePerson(baseContact);
    expect(payload.names).toEqual([{ givenName: 'Max', familyName: 'Mustermann' }]);
    expect(payload.organizations).toEqual([{ name: 'Muster GmbH', title: 'Head of Sales' }]);
  });

  it('maps phones and emails with their labels as the Google "type"', () => {
    const payload = contactToGooglePerson(baseContact);
    expect(payload.phoneNumbers).toEqual([{ value: '+49 30 1234567', type: 'work' }]);
    expect(payload.emailAddresses).toEqual([{ value: 'max@muster.de', type: 'work' }]);
  });

  it('maps addresses and website', () => {
    const payload = contactToGooglePerson(baseContact);
    expect(payload.addresses).toEqual([
      { streetAddress: 'Musterstr. 1', city: 'Berlin', postalCode: '10115', country: 'Deutschland', type: 'work' },
    ]);
    expect(payload.urls).toEqual([{ value: 'https://muster.de', type: 'work' }]);
  });

  it('combines notes and tags into a single biography field', () => {
    const payload = contactToGooglePerson(baseContact);
    expect(payload.biographies).toEqual([
      { value: 'Getroffen auf der Konferenz X\nTags: Konferenz X 2026, Kunde', contentType: 'TEXT_PLAIN' },
    ]);
  });

  it('omits empty sections instead of sending empty arrays', () => {
    const minimal: Contact = { ...baseContact, phones: [], emails: [], addresses: [], website: undefined, tags: [], notes: undefined };
    const payload = contactToGooglePerson(minimal);
    expect(payload.phoneNumbers).toBeUndefined();
    expect(payload.emailAddresses).toBeUndefined();
    expect(payload.addresses).toBeUndefined();
    expect(payload.urls).toBeUndefined();
    expect(payload.biographies).toBeUndefined();
  });

  it('adds a contact-group membership only when a group resource name is given', () => {
    expect(contactToGooglePerson(baseContact).memberships).toBeUndefined();
    expect(contactToGooglePerson(baseContact, 'contactGroups/abc123').memberships).toEqual([
      { contactGroupMembership: { contactGroupResourceName: 'contactGroups/abc123' } },
    ]);
  });
});
