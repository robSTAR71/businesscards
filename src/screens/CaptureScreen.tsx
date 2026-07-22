import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { extractContactFromPhoto } from '../services/cardExtraction';
import { createOcrService, MissingOcrConfigError } from '../services/ocrService';

type Props = NativeStackScreenProps<RootStackParamList, 'Capture'>;

export default function CaptureScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <View style={styles.center} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>Kamerazugriff wird benötigt, um Visitenkarten zu fotografieren.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Zugriff erlauben</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo) throw new Error('Kein Foto aufgenommen.');

      try {
        const ocrService = createOcrService();
        const result = await extractContactFromPhoto(photo.uri, ocrService);
        navigation.replace('Review', {
          photoUri: photo.uri,
          initialData: result.data,
          fieldSources: result.fieldSources,
        });
      } catch (error) {
        if (error instanceof MissingOcrConfigError) {
          Alert.alert(
            'OCR nicht konfiguriert',
            'Kein Cloud-OCR-Dienst eingerichtet (EXPO_PUBLIC_OCR_ENDPOINT fehlt). Du kannst die Kontaktdaten trotzdem manuell eintragen.',
            [{ text: 'Weiter zur manuellen Eingabe' }]
          );
          navigation.replace('Review', { photoUri: photo.uri });
        } else {
          throw error;
        }
      }
    } catch (error) {
      Alert.alert('Fehler', error instanceof Error ? error.message : 'Unbekannter Fehler beim Aufnehmen.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <View style={styles.controls}>
        {busy ? (
          <ActivityIndicator size="large" color="#fff" />
        ) : (
          <TouchableOpacity style={styles.shutterButton} onPress={handleCapture} />
        )}
        <Text style={styles.hint}>Visitenkarte im Rahmen ausrichten und fotografieren</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  message: { textAlign: 'center', marginBottom: 16 },
  controls: { position: 'absolute', bottom: 32, left: 0, right: 0, alignItems: 'center', gap: 12 },
  shutterButton: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', borderWidth: 4, borderColor: '#ccc' },
  hint: { color: '#fff', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  primaryButton: { backgroundColor: '#0a7ea4', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  primaryButtonText: { color: '#fff', fontWeight: '600' },
});
