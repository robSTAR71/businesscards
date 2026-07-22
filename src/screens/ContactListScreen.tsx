import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import type { Contact, ContextLabel } from '../types/contact';
import { listContacts } from '../db/contactRepository';
import { shareAllContacts } from '../services/vcardShare';

type Props = NativeStackScreenProps<RootStackParamList, 'ContactList'>;

const FILTERS: { label: string; value: ContextLabel | undefined }[] = [
  { label: 'Alle', value: undefined },
  { label: 'Beruflich', value: 'beruflich' },
  { label: 'Privat', value: 'privat' },
  { label: 'Bi', value: 'mischung' },
];

export default function ContactListScreen({ navigation }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filter, setFilter] = useState<ContextLabel | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      setContacts(listContacts(filter ? { contextLabel: filter } : {}));
    }, [filter])
  );

  const handleExportAll = () => {
    if (contacts.length === 0) {
      Alert.alert('Keine Kontakte', 'Es gibt noch keine Kontakte zum Exportieren.');
      return;
    }
    shareAllContacts(contacts).catch((error) =>
      Alert.alert('Export fehlgeschlagen', error instanceof Error ? error.message : 'Unbekannter Fehler.')
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.label}
            style={[styles.filterChip, filter === f.value && styles.filterChipSelected]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterChipText, filter === f.value && styles.filterChipTextSelected]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Noch keine Kontakte. Tippe unten auf „Karte scannen“, um loszulegen.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Review', { contactId: item.id })}>
            <View style={styles.rowTextContainer}>
              <Text style={styles.rowName}>
                {[item.firstName, item.lastName].filter(Boolean).join(' ') || item.organization || 'Unbenannt'}
              </Text>
              {!!item.organization && <Text style={styles.rowSubtitle}>{item.organization}</Text>}
            </View>
            <Text style={styles.rowBadge}>{item.contextLabel}</Text>
          </TouchableOpacity>
        )}
      />

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleExportAll}>
          <Text style={styles.secondaryButtonText}>Alle exportieren</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('GalleryImport')}>
          <Text style={styles.secondaryButtonText}>Aus Galerie</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Capture')}>
          <Text style={styles.primaryButtonText}>Karte scannen</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  filterRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  filterChip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  filterChipSelected: { backgroundColor: '#0a7ea4', borderColor: '#0a7ea4' },
  filterChipText: { color: '#333', fontSize: 13 },
  filterChipTextSelected: { color: '#fff', fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 40, paddingHorizontal: 24 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rowTextContainer: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: '600' },
  rowSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  rowBadge: { fontSize: 12, color: '#0a7ea4', textTransform: 'capitalize' },
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  primaryButton: { flex: 1, backgroundColor: '#0a7ea4', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { flex: 1, borderWidth: 1, borderColor: '#0a7ea4', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  secondaryButtonText: { color: '#0a7ea4', fontWeight: '600' },
});
