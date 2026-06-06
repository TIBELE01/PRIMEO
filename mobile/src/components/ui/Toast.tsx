// Toast notification component
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

const COLORS = { success: '#469A0E', error: '#D41313', info: '#1056E0', warning: '#D67309' };

export function Toast({ message, type }: ToastProps) {
  return (
    <View style={[styles.container, { backgroundColor: COLORS[type] }]}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 16, marginBottom: 8 },
  text: { color: '#fff', fontSize: 14, fontWeight: '500' },
});
