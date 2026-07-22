import { parseVCardText } from '../vcardParser';
import { contactToVCard, contactsToVCard } from '../vcardExport';
import type { Contact } from '../../types/contact';

const sampleContact: Contact = {
  id: 'abc-123',
  firstName: 'Max',
  lastName: 'Mustermann',
  organization: 'Muster GmbH',
  jobTitle: 'Head of Sales',
  phones: [{ label: 'work', number: '+49 30 1234567' }],
  emails: [{ label: 'work', address: 'max@muster.de' }],
  addresses: [
    { label: 'work', street: 'Musterstr. 1', city: 'Berlin', postalCode: '10115', country: 'Deutschland' },
  ],
  website: 'https://muster.de',
  notes: 'Getroffen auf der Konferenz X, 2026',
  contextLabel: 'beruflich',
  tags: ['Konferenz X 2026', 'Kunde'],
  fieldSources: {},
  createdAt: '2026-07-20T10:00:00.000Z',
  updatedAt: '2026-07-20T10:00:00.000Z',
};

describe('contactToVCard', () => {
  it('produces a valid VCARD block', () => {
    const vcard = contactToVCard(sampleContact);
    expect(vcard).toMatch(/^BEGIN:VCARD\r\n/);
    expect(vcard).toMatch(/END:VCARD$/);
    expect(vcard).toContain('N:Mustermann;Max;;;');
    expect(vcard).toContain('FN:Max Mustermann');
    expect(vcard).toContain('ORG:Muster GmbH');
    expect(vcard).toContain('TEL;TYPE=WORK:+49 30 1234567');
    expect(vcard).toContain('EMAIL;TYPE=WORK:max@muster.de');
    expect(vcard).toContain('URL:https://muster.de');
  });

  it('escapes commas in CATEGORIES-relevant tags without breaking the line', () => {
    const withComma: Contact = { ...sampleContact, tags: ['Tag, mit Komma'] };
    const vcard = contactToVCard(withComma);
    expect(vcard).toContain('CATEGORIES:beruflich,Tag\\, mit Komma');
  });

  it('round-trips through the parser (export then re-import)', () => {
    const vcard = contactToVCard(sampleContact);
    const reparsed = parseVCardText(vcard);
    expect(reparsed?.firstName).toBe(sampleContact.firstName);
    expect(reparsed?.lastName).toBe(sampleContact.lastName);
    expect(reparsed?.organization).toBe(sampleContact.organization);
    expect(reparsed?.phones).toEqual(sampleContact.phones);
    expect(reparsed?.emails).toEqual(sampleContact.emails);
    expect(reparsed?.addresses).toEqual(sampleContact.addresses);
  });

  it('falls back to organization for FN when no name is set', () => {
    const noName: Contact = { ...sampleContact, firstName: undefined, lastName: undefined };
    expect(contactToVCard(noName)).toContain('FN:Muster GmbH');
  });
});

describe('contactsToVCard', () => {
  it('concatenates multiple contacts into one file', () => {
    const combined = contactsToVCard([sampleContact, { ...sampleContact, id: 'def-456', firstName: 'Anna' }]);
    expect(combined.match(/BEGIN:VCARD/g)).toHaveLength(2);
    expect(combined.match(/END:VCARD/g)).toHaveLength(2);
  });
});
