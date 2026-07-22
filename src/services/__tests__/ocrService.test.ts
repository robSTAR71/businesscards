import { normalizeOcrResponse, RemoteOcrService } from '../ocrService';

describe('normalizeOcrResponse', () => {
  it('returns empty object for non-object input', () => {
    expect(normalizeOcrResponse(null)).toEqual({});
    expect(normalizeOcrResponse('some string')).toEqual({});
  });

  it('extracts well-formed fields', () => {
    const result = normalizeOcrResponse({
      firstName: 'Max',
      lastName: 'Mustermann',
      organization: 'Muster GmbH',
      phones: [{ label: 'work', number: '+49 30 1234567' }],
      emails: [{ label: 'work', address: 'max@muster.de' }],
      addresses: [{ label: 'work', street: 'Musterstr. 1', city: 'Berlin' }],
      website: 'https://muster.de',
    });

    expect(result.firstName).toBe('Max');
    expect(result.phones).toEqual([{ label: 'work', number: '+49 30 1234567' }]);
    expect(result.emails).toEqual([{ label: 'work', address: 'max@muster.de' }]);
    expect(result.addresses).toEqual([{ label: 'work', street: 'Musterstr. 1', city: 'Berlin', postalCode: undefined, country: undefined }]);
  });

  it('drops malformed array entries instead of throwing', () => {
    const result = normalizeOcrResponse({
      phones: [{ label: 'work' }, 'not an object', { number: '+123' }],
      emails: 'not an array',
    });
    expect(result.phones).toEqual([{ label: 'other', number: '+123' }]);
    expect(result.emails).toBeUndefined();
  });

  it('ignores unknown/empty string fields', () => {
    const result = normalizeOcrResponse({ firstName: '   ', extraJunkField: 'ignored' });
    expect(result.firstName).toBeUndefined();
  });
});

describe('RemoteOcrService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('posts the image and normalizes a successful response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ firstName: 'Anna', emails: [{ label: 'work', address: 'anna@firma.de' }] }),
    }) as unknown as typeof fetch;

    const service = new RemoteOcrService('https://example.com/ocr');
    const result = await service.extractContact({ base64Image: 'ZmFrZQ==', mediaType: 'image/jpeg' });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/ocr',
      expect.objectContaining({ method: 'POST' })
    );
    expect(result.firstName).toBe('Anna');
  });

  it('throws a clear error on a non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'internal error',
    }) as unknown as typeof fetch;

    const service = new RemoteOcrService('https://example.com/ocr');
    await expect(service.extractContact({ base64Image: 'x', mediaType: 'image/jpeg' })).rejects.toThrow('500');
  });
});
