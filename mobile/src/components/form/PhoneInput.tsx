// PhoneInput: phone number input with country code prefix
import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

interface PhoneInputProps {
  countryCode?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({ countryCode = '+225', value, onChangeText, error }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Téléphone</Text>
      <View style={[styles.row, !!error && styles.errorBorder]}>
        <View style={styles.prefix}><Text style={styles.prefixText}>{countryCode}</Text></View>
        <TextInput style={styles.input} value={value} onChangeText={onChangeText} keyboardType="phone-pad" placeholder="XX XX XX XX XX" />
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6 },
  row: { flexDirection: 'row', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, overflow: 'hidden', backgroundColor: '#fff' },
  errorBorder: { borderColor: '#B71C1C' },
  prefix: { backgroundColor: '#EFF5FF', paddingHorizontal: 14, justifyContent: 'center' },
  prefixText: { color: '#1056E0', fontWeight: '700', fontSize: 14 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  error: { color: '#B71C1C', fontSize: 12, marginTop: 4 },
});
