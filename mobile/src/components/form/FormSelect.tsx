// FormSelect: native picker wrapped for form use
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface FormSelectProps {
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export const FormSelect: React.FC<FormSelectProps> = ({ label, options, value, onChange, error }) => {
  // Placeholder: use @react-native-picker/picker or expo-select in full implementation
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.selectBox, !!error && styles.errorBorder]}>
        <Text style={styles.selectedText}>{options.find(o => o.value === value)?.label ?? 'Sélectionner...'}</Text>
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6 },
  selectBox: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff' },
  errorBorder: { borderColor: '#B71C1C' },
  selectedText: { fontSize: 14, color: '#333' },
  error: { color: '#B71C1C', fontSize: 12, marginTop: 4 },
});
