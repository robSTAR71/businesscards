import { deriveFieldSources, mergeFieldSources } from '../fieldSources';

describe('deriveFieldSources', () => {
  it('marks non-empty scalar and array fields', () => {
    const sources = deriveFieldSources(
      { firstName: 'Max', notes: undefined, phones: [{ label: 'work', number: '123' }], emails: [] },
      'qr'
    );
    expect(sources).toEqual({ firstName: 'qr', phones: 'qr' });
  });

  it('ignores empty strings, null, undefined and empty arrays', () => {
    const sources = deriveFieldSources({ firstName: '', lastName: null, website: undefined, phones: [] }, 'ocr');
    expect(sources).toEqual({});
  });
});

describe('mergeFieldSources', () => {
  it('lets override win per field, keeping base fields untouched otherwise', () => {
    const merged = mergeFieldSources({ firstName: 'ocr', phones: 'ocr' }, { firstName: 'qr' });
    expect(merged).toEqual({ firstName: 'qr', phones: 'ocr' });
  });
});
