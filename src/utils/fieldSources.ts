import type { FieldSource } from '../types/contact';

type PartialFields = Record<string, unknown>;

/** Marks every populated top-level field of `data` as coming from `source`, for the review screen's "woher kommt das?" hints. */
export function deriveFieldSources(data: PartialFields, source: FieldSource): Partial<Record<string, FieldSource>> {
  const sources: Partial<Record<string, FieldSource>> = {};
  for (const [key, value] of Object.entries(data)) {
    const isEmptyArray = Array.isArray(value) && value.length === 0;
    if (value !== undefined && value !== null && value !== '' && !isEmptyArray) {
      sources[key] = source;
    }
  }
  return sources;
}

/** Merges two field-source maps, letting `override` win field-by-field (used when QR data takes priority over OCR guesses). */
export function mergeFieldSources(
  base: Partial<Record<string, FieldSource>>,
  override: Partial<Record<string, FieldSource>>
): Partial<Record<string, FieldSource>> {
  return { ...base, ...override };
}
