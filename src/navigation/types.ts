import type { FieldSource } from '../types/contact';
import type { OcrContactData } from '../services/ocrService';

export type RootStackParamList = {
  ContactList: undefined;
  Capture: undefined;
  GalleryImport: undefined;
  Review:
    | { contactId: string }
    | {
        photoUri?: string;
        initialData?: OcrContactData;
        fieldSources?: Partial<Record<string, FieldSource>>;
        /** Remaining photo URIs still to process in a gallery-import batch. */
        remainingQueue?: string[];
        /** Total batch size, used to render "Karte X von Y" progress. */
        queueTotal?: number;
      };
};
