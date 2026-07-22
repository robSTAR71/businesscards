import * as FileSystem from 'expo-file-system/legacy';
import { scanFromURLAsync } from 'expo-camera';
import { parseContactQrPayload } from '../utils/vcardParser';
import { deriveFieldSources, mergeFieldSources } from '../utils/fieldSources';
import type { CardVisionService, OcrContactData } from './ocrService';
import type { FieldSource } from '../types/contact';

export interface ExtractionResult {
  data: OcrContactData;
  fieldSources: Partial<Record<string, FieldSource>>;
  usedOcr: boolean;
}

/** A QR hit only replaces the cloud-OCR call if it already gives us a name and at least one way to reach the person. */
export function isQrDataSufficient(data: OcrContactData): boolean {
  const hasName = Boolean(data.firstName || data.lastName || data.organization);
  const hasContactMethod = Boolean((data.phones?.length ?? 0) > 0 || (data.emails?.length ?? 0) > 0);
  return hasName && hasContactMethod;
}

/** QR data is exact (the person encoded it themselves), so it wins over OCR guesses field-by-field. */
export function mergeQrAndOcrData(
  qrData: OcrContactData | null,
  ocrData: OcrContactData | null
): { data: OcrContactData; fieldSources: Partial<Record<string, FieldSource>> } {
  const merged: OcrContactData = { ...ocrData, ...qrData };
  if (ocrData?.phones || qrData?.phones) {
    merged.phones = [...(ocrData?.phones ?? []), ...(qrData?.phones ?? [])];
  }
  if (ocrData?.emails || qrData?.emails) {
    merged.emails = [...(ocrData?.emails ?? []), ...(qrData?.emails ?? [])];
  }
  if (ocrData?.addresses || qrData?.addresses) {
    merged.addresses = [...(ocrData?.addresses ?? []), ...(qrData?.addresses ?? [])];
  }

  const ocrSources = ocrData ? deriveFieldSources(ocrData, 'ocr') : {};
  const qrSources = qrData ? deriveFieldSources(qrData, 'qr') : {};

  return { data: merged, fieldSources: mergeFieldSources(ocrSources, qrSources) };
}

function guessMediaType(uri: string): 'image/jpeg' | 'image/png' {
  return uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
}

/**
 * Full pipeline for a captured/picked photo: try a live QR scan first (free, exact), and only
 * fall back to the paid cloud-OCR call when the QR code is missing or doesn't carry enough data.
 */
export async function extractContactFromPhoto(
  photoUri: string,
  ocrService: CardVisionService
): Promise<ExtractionResult> {
  let qrData: OcrContactData | null = null;
  try {
    const barcodes = await scanFromURLAsync(photoUri, ['qr']);
    for (const barcode of barcodes) {
      const parsed = parseContactQrPayload(barcode.data);
      if (parsed) {
        qrData = parsed;
        break;
      }
    }
  } catch {
    // No QR code found or scanning unsupported on this platform — fall through to OCR.
  }

  if (qrData && isQrDataSufficient(qrData)) {
    return { data: qrData, fieldSources: deriveFieldSources(qrData, 'qr'), usedOcr: false };
  }

  const base64Image = await FileSystem.readAsStringAsync(photoUri, { encoding: 'base64' });
  const ocrData = await ocrService.extractContact({ base64Image, mediaType: guessMediaType(photoUri) });

  const { data, fieldSources } = mergeQrAndOcrData(qrData, ocrData);
  return { data, fieldSources, usedOcr: true };
}
