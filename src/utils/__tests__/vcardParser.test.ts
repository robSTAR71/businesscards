import { parseContactQrPayload, parseMeCardText, parseVCardText } from '../vcardParser';

describe('parseVCardText', () => {
  const sample = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'N:Mustermann;Max;;;',
    'FN:Max Mustermann',
    'ORG:Muster GmbH',
    'TITLE:Head of Sales',
    'TEL;TYPE=WORK,VOICE:+49 30 1234567',
    'TEL;TYPE=CELL:+49 170 7654321',
    'EMAIL;TYPE=WORK:max@muster.de',
    'ADR;TYPE=WORK:;;Musterstr. 1;Berlin;;10115;Deutschland',
    'URL:https://muster.de',
    'END:VCARD',
  ].join('\r\n');

  it('extracts name, org, title', () => {
    const result = parseVCardText(sample);
    expect(result?.firstName).toBe('Max');
    expect(result?.lastName).toBe('Mustermann');
    expect(result?.organization).toBe('Muster GmbH');
    expect(result?.jobTitle).toBe('Head of Sales');
  });

  it('extracts multiple phones with labels', () => {
    const result = parseVCardText(sample);
    expect(result?.phones).toEqual([
      { label: 'work', number: '+49 30 1234567' },
      { label: 'cell', number: '+49 170 7654321' },
    ]);
  });

  it('extracts email and website', () => {
    const result = parseVCardText(sample);
    expect(result?.emails).toEqual([{ label: 'work', address: 'max@muster.de' }]);
    expect(result?.website).toBe('https://muster.de');
  });

  it('extracts address fields', () => {
    const result = parseVCardText(sample);
    expect(result?.addresses).toEqual([
      {
        label: 'work',
        street: 'Musterstr. 1',
        city: 'Berlin',
        postalCode: '10115',
        country: 'Deutschland',
      },
    ]);
  });

  it('returns null for non-vCard text', () => {
    expect(parseVCardText('just some random OCR text')).toBeNull();
  });

  it('falls back to FN when N is missing', () => {
    const result = parseVCardText('BEGIN:VCARD\nVERSION:3.0\nFN:Anna Weber\nEND:VCARD');
    expect(result?.firstName).toBe('Anna');
    expect(result?.lastName).toBe('Weber');
  });

  it('handles folded (multi-line) values', () => {
    const folded = 'BEGIN:VCARD\nVERSION:3.0\nNOTE:Erste Zeile \n weiter zweite Zeile\nEND:VCARD';
    const result = parseVCardText(folded);
    expect(result?.notes).toBe('Erste Zeile weiter zweite Zeile');
  });
});

describe('parseMeCardText', () => {
  it('parses a typical MeCard payload', () => {
    const mecard = 'MECARD:N:Tanaka,Yuki;ORG:Acme Corp;TEL:+81312345678;EMAIL:yuki@acme.jp;URL:https://acme.jp;;';
    const result = parseMeCardText(mecard);
    expect(result?.lastName).toBe('Tanaka');
    expect(result?.firstName).toBe('Yuki');
    expect(result?.organization).toBe('Acme Corp');
    expect(result?.phones).toEqual([{ label: 'other', number: '+81312345678' }]);
    expect(result?.emails).toEqual([{ label: 'other', address: 'yuki@acme.jp' }]);
    expect(result?.website).toBe('https://acme.jp');
  });

  it('returns null for non-MeCard text', () => {
    expect(parseMeCardText('BEGIN:VCARD\nEND:VCARD')).toBeNull();
  });
});

describe('parseContactQrPayload', () => {
  it('dispatches to vCard parser', () => {
    const result = parseContactQrPayload('BEGIN:VCARD\nVERSION:3.0\nFN:Jane Doe\nEND:VCARD');
    expect(result?.firstName).toBe('Jane');
  });

  it('dispatches to MeCard parser', () => {
    const result = parseContactQrPayload('MECARD:N:Doe,Jane;;');
    expect(result?.lastName).toBe('Doe');
  });

  it('returns null for an unrelated URL QR code', () => {
    expect(parseContactQrPayload('https://example.com/some-page')).toBeNull();
  });
});
