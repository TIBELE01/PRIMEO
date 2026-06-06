// DatePicker: cross-platform date selector
import React, { useState } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';

interface DatePickerProps {
  label: string;
  value?: Date;
  onChange: (date: Date) => void;
  error?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({ label, value, onChange, error }) => {
  // Placeholder: integrate @react-native-community/datetimepicker in full implementation
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={[styles.btn, !!error && styles.errorBorder]}>
        <Text style={styles.text}>{value ? value.toLocaleDateString('fr-FR') : 'Sélectionner une date'}</Text>
      </TouchableOpacity>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6 },
  btn: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff' },
  errorBorder: { borderColor: '#B71C1C' },
  text: { fontSize: 14, color: '#333' },
  error: { color: '#B71C1C', fontSize: 12, marginTop: 4 },
});
