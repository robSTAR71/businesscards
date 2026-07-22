import { Alert } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { createOcrService, MissingOcrConfigError } from '../services/ocrService';
import { extractContactFromPhoto } from '../services/cardExtraction';

type Navigation = NativeStackNavigationProp<RootStackParamList, keyof RootStackParamList>;

/**
 * Extracts contact data from the next photo in a gallery-import batch and replaces the
 * current Review screen with it, carrying the rest of the queue along. Used both when a
 * batch import starts (first photo) and after each save (to advance to the next one) —
 * shared here because both call sites need identical extraction + error handling.
 */
export async function presentNextPhoto(
  navigation: Navigation,
  queue: string[],
  queueTotal: number
): Promise<void> {
  if (queue.length === 0) {
    navigation.navigate('ContactList');
    return;
  }

  const [photoUri, ...remainingQueue] = queue;

  try {
    const ocrService = createOcrService();
    const result = await extractContactFromPhoto(photoUri, ocrService);
    navigation.replace('Review', { photoUri, initialData: result.data, fieldSources: result.fieldSources, remainingQueue, queueTotal });
  } catch (error) {
    if (error instanceof MissingOcrConfigError) {
      navigation.replace('Review', { photoUri, remainingQueue, queueTotal });
    } else {
      Alert.alert(
        'Fehler bei der Verarbeitung',
        error instanceof Error ? error.message : 'Unbekannter Fehler beim Verarbeiten des Fotos.'
      );
      // Skip the problematic photo rather than stalling the whole batch.
      await presentNextPhoto(navigation, remainingQueue, queueTotal);
    }
  }
}
