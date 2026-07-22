import React, { useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import type { AddressEntry, Contact, ContextLabel, EmailEntry, FieldSource, PhoneEntry } from '../types/contact';
import { ListFieldEditor } from '../components/ListFieldEditor';
import { getContact, insertContact, updateContact } from '../db/contactRepository';
import { suggestContextLabel } from '../utils/contextLabelHeuristic';
import { shareContact } from '../services/vcardShare';

type Props = NativeStackScreenProps<RootStackParamList, 'Review'>;

const CONTEXT_LABELS: ContextLabel[] = ['beruflich', 'privat', 'mischung'];
const CONTEXT_LABEL_TITLES: Record<ContextLabel, string> = {
  beruflich: 'Beruflich',
  privat: 'Privat',
  mischung: 'Mischung',
};

function sourceHint(fieldSources: Partial<Record<string, FieldSource>>, field: string): string {
  const source = fieldSources[field];
  if (source === 'qr') return ' · aus QR-Code';
  if (source === 'ocr') return ' · aus Foto (KI)';
  return '';
}

export default function ReviewScreen({ route, navigation }: Props) {
  const params = route.params ?? {};
  const isEditingExisting = 'contactId' in params;

  const existingContact = useMemo(
    () => (isEditingExisting ? getContact((params as { contactId: string }).contactId) : null),
    [isEditingExisting]
  );

  const initialData = isEditingExisting ? existingContact ?? {} : (params as { initialData?: Partial<Contact> }).initialData ?? {};
  const fieldSources = isEditingExisting
    ? existingContact?.fieldSources ?? {}
    : (params as { fieldSources?: Partial<Record<string, FieldSource>> }).fieldSources ?? {};
  const photoUri = isEditingExisting
    ? existingContact?.photoFrontUri
    : (params as { photoUri?: string }).photoUri;

  const [firstName, setFirstName] = useState(initialData.firstName ?? '');
  const [lastName, setLastName] = useState(initialData.lastName ?? '');
  const [organization, setOrganization] = useState(initialData.organization ?? '');
  const [jobTitle, setJobTitle] = useState(initialData.jobTitle ?? '');
  const [website, setWebsite] = useState(initialData.website ?? '');
  const [notes, setNotes] = useState(initialData.notes ?? '');

  const [phones, setPhones] = useState<{ label: string; value: string }[]>(
    (initialData.phones as PhoneEntry[] | undefined)?.map((p) => ({ label: p.label, value: p.number })) ?? []
  );
  const [emails, setEmails] = useState<{ label: string; value: string }[]>(
    (initialData.emails as EmailEntry[] | undefined)?.map((e) => ({ label: e.label, value: e.address })) ?? []
  );

  const firstAddress = (initialData.addresses as AddressEntry[] | undefined)?.[0];
  const restAddresses = (initialData.addresses as AddressEntry[] | undefined)?.slice(1) ?? [];
  const [addressStreet, setAddressStreet] = useState(firstAddress?.street ?? '');
  const [addressCity, setAddressCity] = useState(firstAddress?.city ?? '');
  const [addressPostalCode, setAddressPostalCode] = useState(firstAddress?.postalCode ?? '');
  const [addressCountry, setAddressCountry] = useState(firstAddress?.country ?? '');

  const [contextLabel, setContextLabel] = useState<ContextLabel>(
    initialData.contextLabel ??
      suggestContextLabel({
        organization: initialData.organization,
        emails: (initialData.emails as EmailEntry[] | undefined) ?? [],
      })
  );
  const [tagsText, setTagsText] = useState((initialData.tags ?? []).join(', '));

  const buildContactPayload = () => {
    const addresses: AddressEntry[] = [];
    if (addressStreet || addressCity || addressPostalCode || addressCountry) {
      addresses.push({
        label: firstAddress?.label ?? 'work',
        street: addressStreet || undefined,
        city: addressCity || undefined,
        postalCode: addressPostalCode || undefined,
        country: addressCountry || undefined,
      });
    }
    addresses.push(...restAddresses);

    return {
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      organization: organization || undefined,
      jobTitle: jobTitle || undefined,
      website: website || undefined,
      notes: notes || undefined,
      phones: phones.filter((p) => p.value.trim()).map((p) => ({ label: p.label, number: p.value.trim() })),
      emails: emails.filter((e) => e.value.trim()).map((e) => ({ label: e.label, address: e.value.trim() })),
      addresses,
      contextLabel,
      tags: tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      photoFrontUri: photoUri,
      photoBackUri: existingContact?.photoBackUri,
      fieldSources,
    };
  };

  const handleSave = () => {
    const payload = buildContactPayload();
    if (!payload.firstName && !payload.lastName && !payload.organization) {
      Alert.alert('Fehlende Angabe', 'Bitte mindestens einen Namen oder eine Firma eintragen.');
      return;
    }

    if (isEditingExisting && existingContact) {
      updateContact({ ...existingContact, ...payload });
    } else {
      insertContact(payload);
    }
    navigation.goBack();
  };

  const handleSaveAndShare = () => {
    const payload = buildContactPayload();
    const saved =
      isEditingExisting && existingContact ? updateContact({ ...existingContact, ...payload }) : insertContact(payload);
    shareContact(saved).catch((error) =>
      Alert.alert('Teilen fehlgeschlagen', error instanceof Error ? error.message : 'Unbekannter Fehler.')
    );
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {photoUri && <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />}

      <Field label={`Vorname${sourceHint(fieldSources, 'firstName')}`} value={firstName} onChangeText={setFirstName} />
      <Field label={`Nachname${sourceHint(fieldSources, 'lastName')}`} value={lastName} onChangeText={setLastName} />
      <Field
        label={`Firma${sourceHint(fieldSources, 'organization')}`}
        value={organization}
        onChangeText={setOrganization}
      />
      <Field label={`Position${sourceHint(fieldSources, 'jobTitle')}`} value={jobTitle} onChangeText={setJobTitle} />

      <ListFieldEditor
        title={`Telefon${sourceHint(fieldSources, 'phones')}`}
        labels={['work', 'mobile', 'fax', 'other']}
        entries={phones}
        onChange={setPhones}
        placeholder="+49 30 1234567"
        keyboardType="phone-pad"
      />
      <ListFieldEditor
        title={`E-Mail${sourceHint(fieldSources, 'emails')}`}
        labels={['work', 'other']}
        entries={emails}
        onChange={setEmails}
        placeholder="name@firma.de"
        keyboardType="email-address"
      />

      <Text style={styles.sectionTitle}>{`Adresse${sourceHint(fieldSources, 'addresses')}`}</Text>
      <Field label="Straße" value={addressStreet} onChangeText={setAddressStreet} />
      <Field label="Stadt" value={addressCity} onChangeText={setAddressCity} />
      <Field label="PLZ" value={addressPostalCode} onChangeText={setAddressPostalCode} />
      <Field label="Land" value={addressCountry} onChangeText={setAddressCountry} />

      <Field label={`Website${sourceHint(fieldSources, 'website')}`} value={website} onChangeText={setWebsite} />
      <Field label={`Notizen${sourceHint(fieldSources, 'notes')}`} value={notes} onChangeText={setNotes} multiline />

      <Text style={styles.sectionTitle}>Kontext</Text>
      <View style={styles.labelRow}>
        {CONTEXT_LABELS.map((label) => (
          <TouchableOpacity
            key={label}
            style={[styles.labelChip, contextLabel === label && styles.labelChipSelected]}
            onPress={() => setContextLabel(label)}
          >
            <Text style={[styles.labelChipText, contextLabel === label && styles.labelChipTextSelected]}>
              {CONTEXT_LABEL_TITLES[label]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Field label="Tags (Komma-getrennt)" value={tagsText} onChangeText={setTagsText} placeholder="Konferenz X 2026, Kunde" />

      <TouchableOpacity style={styles.primaryButton} onPress={handleSave}>
        <Text style={styles.primaryButtonText}>Speichern</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={handleSaveAndShare}>
        <Text style={styles.secondaryButtonText}>Speichern & als vCard teilen</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline={multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 48 },
  photo: { width: '100%', height: 180, borderRadius: 12, marginBottom: 16, backgroundColor: '#eee' },
  fieldContainer: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 4, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16 },
  multilineInput: { minHeight: 70, textAlignVertical: 'top' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginTop: 8, marginBottom: 10 },
  labelRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  labelChip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  labelChipSelected: { backgroundColor: '#0a7ea4', borderColor: '#0a7ea4' },
  labelChipText: { color: '#333' },
  labelChipTextSelected: { color: '#fff', fontWeight: '600' },
  primaryButton: { backgroundColor: '#0a7ea4', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryButton: { borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  secondaryButtonText: { color: '#0a7ea4', fontWeight: '600' },
});
