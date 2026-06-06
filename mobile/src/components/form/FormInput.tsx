import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export const FormInput: React.FC<FormInputProps> = ({ label, error, onFocus, onBlur, ...props }) => {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? '#D41313' : focused ? '#1056E0' : '#E2E8F0';

  return (
    <View style={styles.container}>
      <Text style={[styles.label, focused && styles.labelActive, !!error && styles.labelErr]}>
        {label}
      </Text>
      <View style={[styles.wrap, { borderColor }, focused && styles.wrapFocused]}>
        <TextInput
          style={styles.input}
          placeholderTextColor="#94A3B8"
          onFocus={e => { setFocused(true); onFocus?.(e); }}
          onBlur={e => { setFocused(false); onBlur?.(e); }}
          {...props}
        />
      </View>
      {!!error && <Text style={styles.error}>⚠ {error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  labelActive: { color: '#1056E0' },
  labelErr: { color: '#D41313' },
  wrap: {
    borderWidth: 1.5,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  wrapFocused: {
    backgroundColor: '#fff',
    shadowColor: '#1056E0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  input: { fontSize: 15, color: '#0F1729', paddingVertical: 12 },
  error: { fontSize: 12, color: '#D41313', marginTop: 6, fontWeight: '500' },
});
