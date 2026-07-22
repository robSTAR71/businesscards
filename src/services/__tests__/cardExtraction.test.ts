import { isQrDataSufficient, mergeQrAndOcrData } from '../cardExtraction';
import type { OcrContactData } from '../ocrService';

describe('isQrDataSufficient', () => {
  it('is sufficient with a name and a phone number', () => {
    expect(isQrDataSufficient({ firstName: 'Max', phones: [{ label: 'work', number: '123' }] })).toBe(true);
  });

  it('is not sufficient with only a name and no way to reach the person', () => {
    expect(isQrDataSufficient({ firstName: 'Max' })).toBe(false);
  });

  it('is not sufficient with only a phone number and no name/organization', () => {
    expect(isQrDataSufficient({ phones: [{ label: 'work', number: '123' }] })).toBe(false);
  });

  it('accepts organization instead of a personal name', () => {
    expect(isQrDataSufficient({ organization: 'Muster GmbH', emails: [{ label: 'work', address: 'a@b.de' }] })).toBe(
      true
    );
  });
});

describe('mergeQrAndOcrData', () => {
  const ocrData: OcrContactData = {
    firstName: 'Max',
    lastName: 'Mustermann',
    jobTitle: 'Head of Sales',
    phones: [{ label: 'work', number: '+49 30 000' }],
  };
  const qrData: OcrContactData = {
    firstName: 'Max',
    emails: [{ label: 'work', address: 'max@muster.de' }],
  };

  it('lets QR fields override OCR fields of the same name', () => {
    const { data } = mergeQrAndOcrData(qrData, ocrData);
    expect(data.firstName).toBe('Max');
    expect(data.jobTitle).toBe('Head of Sales');
  });

  it('concatenates array fields from both sources instead of dropping either', () => {
    const { data } = mergeQrAndOcrData(qrData, ocrData);
    expect(data.phones).toEqual([{ label: 'work', number: '+49 30 000' }]);
    expect(data.emails).toEqual([{ label: 'work', address: 'max@muster.de' }]);
  });

  it('tags fields with the correct source, QR winning ties', () => {
    const { fieldSources } = mergeQrAndOcrData(qrData, ocrData);
    expect(fieldSources.firstName).toBe('qr');
    expect(fieldSources.jobTitle).toBe('ocr');
    expect(fieldSources.emails).toBe('qr');
    expect(fieldSources.phones).toBe('ocr');
  });

  it('handles a null QR result (OCR-only path)', () => {
    const { data, fieldSources } = mergeQrAndOcrData(null, ocrData);
    expect(data.firstName).toBe('Max');
    expect(fieldSources.firstName).toBe('ocr');
  });
});
