import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { RootStackParamList } from './src/navigation/types';
import { initDb } from './src/db/contactRepository';
import ContactListScreen from './src/screens/ContactListScreen';
import CaptureScreen from './src/screens/CaptureScreen';
import GalleryImportScreen from './src/screens/GalleryImportScreen';
import ReviewScreen from './src/screens/ReviewScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    initDb();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="ContactList">
          <Stack.Screen name="ContactList" component={ContactListScreen} options={{ title: 'Kontakte' }} />
          <Stack.Screen name="Capture" component={CaptureScreen} options={{ title: 'Karte scannen' }} />
          <Stack.Screen name="GalleryImport" component={GalleryImportScreen} options={{ title: 'Galerie-Import' }} />
          <Stack.Screen name="Review" component={ReviewScreen} options={{ title: 'Kontakt prüfen' }} />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
