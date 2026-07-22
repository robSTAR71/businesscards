import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Props {
  title: string;
  labels: string[];
  entries: { label: string; value: string }[];
  onChange: (entries: { label: string; value: string }[]) => void;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
}

/** Reusable add/remove list editor shared by the phone-number and e-mail sections of the review screen. */
export function ListFieldEditor({ title, labels, entries, onChange, placeholder, keyboardType }: Props) {
  const updateEntry = (index: number, value: string) => {
    const next = [...entries];
    next[index] = { ...next[index], value };
    onChange(next);
  };

  const cycleLabel = (index: number) => {
    const current = entries[index].label;
    const nextLabel = labels[(labels.indexOf(current) + 1) % labels.length] ?? labels[0];
    const next = [...entries];
    next[index] = { ...next[index], label: nextLabel };
    onChange(next);
  };

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  const addEntry = () => {
    onChange([...entries, { label: labels[0], value: '' }]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {entries.map((entry, index) => (
        <View key={index} style={styles.row}>
          <TouchableOpacity onPress={() => cycleLabel(index)} style={styles.labelPill}>
            <Text style={styles.labelPillText}>{entry.label}</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={entry.value}
            placeholder={placeholder}
            keyboardType={keyboardType}
            onChangeText={(value) => updateEntry(index, value)}
          />
          <TouchableOpacity onPress={() => removeEntry(index)} style={styles.removeButton}>
            <Text style={styles.removeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity onPress={addEntry} style={styles.addButton}>
        <Text style={styles.addButtonText}>+ hinzufügen</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  title: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 6, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  labelPill: { backgroundColor: '#eee', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  labelPillText: { fontSize: 12, color: '#333' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  removeButton: { paddingHorizontal: 8, paddingVertical: 4 },
  removeButtonText: { fontSize: 20, color: '#999' },
  addButton: { alignSelf: 'flex-start', marginTop: 4 },
  addButtonText: { color: '#0a7ea4', fontWeight: '500' },
});
