import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { presentNextPhoto } from '../navigation/photoQueue';

type Props = NativeStackScreenProps<RootStackParamList, 'GalleryImport'>;

/**
 * Entry point for batch-importing existing photos of business cards. Picks multiple images
 * once, then hands off to the same photoQueue pipeline the single-capture flow uses, so every
 * photo gets its own QR-scan → OCR-fallback → Review step just like a freshly taken one.
 */
export default function GalleryImportScreen({ navigation }: Props) {
  const [status, setStatus] = useState<'picking' | 'starting' | 'done'>('picking');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        navigation.goBack();
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (cancelled) return;

      if (result.canceled || result.assets.length === 0) {
        navigation.goBack();
        return;
      }

      setStatus('starting');
      const uris = result.assets.map((asset) => asset.uri);
      await presentNextPhoto(navigation, uris, uris.length);
    })();

    return () => {
      cancelled = true;
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text style={styles.text}>
        {status === 'picking' ? 'Fotos auswählen …' : 'Erste Karte wird verarbeitet …'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  text: { color: '#666' },
});
