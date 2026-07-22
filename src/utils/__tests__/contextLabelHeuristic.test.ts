import { suggestContextLabel } from '../contextLabelHeuristic';

describe('suggestContextLabel', () => {
  it('defaults to beruflich when there is no email at all', () => {
    expect(suggestContextLabel({ emails: [] })).toBe('beruflich');
  });

  it('suggests beruflich for a corporate domain', () => {
    expect(
      suggestContextLabel({ organization: 'Muster GmbH', emails: [{ label: 'work', address: 'max@muster.de' }] })
    ).toBe('beruflich');
  });

  it('suggests privat for a free-mail address with no organization', () => {
    expect(suggestContextLabel({ emails: [{ label: 'other', address: 'max@gmail.com' }] })).toBe('privat');
  });

  it('suggests mischung for a free-mail address that still has an organization', () => {
    expect(
      suggestContextLabel({ organization: 'Freelancer Network', emails: [{ label: 'other', address: 'max@gmail.com' }] })
    ).toBe('mischung');
  });

  it('suggests mischung when one email is corporate and another is free-mail', () => {
    expect(
      suggestContextLabel({
        organization: 'Muster GmbH',
        emails: [
          { label: 'work', address: 'max@muster.de' },
          { label: 'other', address: 'max@gmail.com' },
        ],
      })
    ).toBe('mischung');
  });
});
