import {
  createGoogleContact,
  findOrCreateContactGroup,
  syncContactToGoogle,
  updateGoogleContact,
} from '../googleContactsService';
import type { Contact } from '../../types/contact';

function mockFetchSequence(responses: { ok: boolean; status?: number; json?: unknown; text?: string }[]) {
  const impl = jest.fn();
  for (const response of responses) {
    impl.mockImplementationOnce(async () => ({
      ok: response.ok,
      status: response.status ?? (response.ok ? 200 : 500),
      json: async () => response.json,
      text: async () => response.text ?? '',
    }));
  }
  global.fetch = impl as unknown as typeof fetch;
  return impl;
}

const contact: Contact = {
  id: 'abc-123',
  firstName: 'Max',
  lastName: 'Mustermann',
  phones: [],
  emails: [],
  addresses: [],
  contextLabel: 'beruflich',
  tags: [],
  fieldSources: {},
  createdAt: '2026-07-20T10:00:00.000Z',
  updatedAt: '2026-07-20T10:00:00.000Z',
};

describe('findOrCreateContactGroup', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns the resourceName of an existing group by name', async () => {
    mockFetchSequence([{ ok: true, json: { contactGroups: [{ name: 'Beruflich', resourceName: 'contactGroups/1' }] } }]);
    const resourceName = await findOrCreateContactGroup('token', 'Beruflich');
    expect(resourceName).toBe('contactGroups/1');
  });

  it('creates a new group when none matches by name', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, json: { contactGroups: [] } },
      { ok: true, json: { resourceName: 'contactGroups/2' } },
    ]);
    const resourceName = await findOrCreateContactGroup('token', 'Bi');
    expect(resourceName).toBe('contactGroups/2');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({ method: 'POST' }));
  });
});

describe('createGoogleContact / updateGoogleContact', () => {
  afterEach(() => jest.restoreAllMocks());

  it('creates a contact and returns its resourceName/etag', async () => {
    mockFetchSequence([{ ok: true, json: { resourceName: 'people/1', etag: 'etag-1' } }]);
    const result = await createGoogleContact('token', { names: [{ givenName: 'Max' }] });
    expect(result).toEqual({ resourceName: 'people/1', etag: 'etag-1' });
  });

  it('fetches the current etag before patching an update', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, json: { etag: 'etag-current' } },
      { ok: true, json: { resourceName: 'people/1', etag: 'etag-new' } },
    ]);
    const result = await updateGoogleContact('token', 'people/1', { names: [{ givenName: 'Max' }] });
    expect(result.etag).toBe('etag-new');
    const patchCall = fetchMock.mock.calls[1];
    expect(patchCall[0]).toContain('people/1:updateContact');
    expect(JSON.parse(patchCall[1].body).etag).toBe('etag-current');
  });

  it('throws with the response status on a failed request', async () => {
    mockFetchSequence([{ ok: false, status: 403, text: 'insufficient scope' }]);
    await expect(createGoogleContact('token', {})).rejects.toThrow('403');
  });
});

describe('syncContactToGoogle', () => {
  afterEach(() => jest.restoreAllMocks());

  it('resolves the context group then creates a new contact when none exists yet', async () => {
    mockFetchSequence([
      { ok: true, json: { contactGroups: [{ name: 'Beruflich', resourceName: 'contactGroups/1' }] } },
      { ok: true, json: { resourceName: 'people/new', etag: 'e1' } },
    ]);
    const result = await syncContactToGoogle('token', contact);
    expect(result.resourceName).toBe('people/new');
  });

  it('updates the existing Google contact when googleResourceName is already known', async () => {
    mockFetchSequence([
      { ok: true, json: { contactGroups: [{ name: 'Beruflich', resourceName: 'contactGroups/1' }] } },
      { ok: true, json: { etag: 'etag-current' } },
      { ok: true, json: { resourceName: 'people/existing', etag: 'e2' } },
    ]);
    const result = await syncContactToGoogle('token', { ...contact, googleResourceName: 'people/existing' });
    expect(result.resourceName).toBe('people/existing');
  });

  it('falls back to creating a fresh contact if the stored resourceName no longer exists', async () => {
    mockFetchSequence([
      { ok: true, json: { contactGroups: [{ name: 'Beruflich', resourceName: 'contactGroups/1' }] } },
      { ok: false, status: 404, text: 'not found' },
      { ok: true, json: { resourceName: 'people/fresh', etag: 'e3' } },
    ]);
    const result = await syncContactToGoogle('token', { ...contact, googleResourceName: 'people/gone' });
    expect(result.resourceName).toBe('people/fresh');
  });
});
