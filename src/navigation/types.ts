import type { FieldSource } from '../types/contact';
import type { OcrContactData } from '../services/ocrService';

export type RootStackParamList = {
  ContactList: undefined;
  Capture: undefined;
  Review:
    | { contactId: string }
    | {
        photoUri?: string;
        initialData?: OcrContactData;
        fieldSources?: Partial<Record<string, FieldSource>>;
      };
};
