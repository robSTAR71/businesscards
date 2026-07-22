import { findPotentialDuplicates } from '../duplicateDetection';
import type { Contact } from '../../types/contact';

function makeContact(overrides: Partial<Contact>): Contact {
  return {
    id: 'id-1',
    phones: [],
    emails: [],
    addresses: [],
    contextLabel: 'beruflich',
    tags: [],
    fieldSources: {},
    createdAt: '2026-07-20T10:00:00.000Z',
    updatedAt: '2026-07-20T10:00:00.000Z',
    ...overrides,
  };
}

describe('findPotentialDuplicates', () => {
  const existing = [
    makeContact({
      id: 'existing-1',
      firstName: 'Max',
      lastName: 'Mustermann',
      emails: [{ label: 'work', address: 'Max@Muster.de' }],
      phones: [{ label: 'work', number: '+49 30 123-45' }],
    }),
    makeContact({ id: 'existing-2', firstName: 'Anna', lastName: 'Weber' }),
  ];

  it('matches on email regardless of case/whitespace', () => {
    const matches = findPotentialDuplicates({ emails: [{ label: 'other', address: ' max@muster.de ' }], phones: [] }, existing);
    expect(matches).toEqual([{ contact: existing[0], reason: 'email' }]);
  });

  it('matches on phone number regardless of formatting', () => {
    const matches = findPotentialDuplicates({ emails: [], phones: [{ label: 'other', number: '+4930 12345' }] }, existing);
    expect(matches).toEqual([{ contact: existing[0], reason: 'phone' }]);
  });

  it('matches on exact full name when no email/phone overlap', () => {
    const matches = findPotentialDuplicates({ firstName: 'Anna', lastName: 'Weber', emails: [], phones: [] }, existing);
    expect(matches).toEqual([{ contact: existing[1], reason: 'name' }]);
  });

  it('does not match two contacts that both simply lack a name', () => {
    const matches = findPotentialDuplicates({ emails: [], phones: [] }, [makeContact({ id: 'no-name' })]);
    expect(matches).toEqual([]);
  });

  it('returns no matches when nothing overlaps', () => {
    const matches = findPotentialDuplicates(
      { firstName: 'Jonas', lastName: 'Reiter', emails: [{ label: 'other', address: 'jonas@example.com' }], phones: [] },
      existing
    );
    expect(matches).toEqual([]);
  });

  it('excludes a contact by id (editing an existing contact should not flag itself)', () => {
    const matches = findPotentialDuplicates(
      { firstName: 'Max', lastName: 'Mustermann', emails: [], phones: [] },
      existing,
      'existing-1'
    );
    expect(matches).toEqual([]);
  });
});
