// ErrorFallback: shown by ErrorBoundary when an unhandled error occurs
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.title}>Une erreur est survenue</Text>
      <Text style={styles.message}>{error?.message ?? 'Erreur inconnue'}</Text>
      {resetError && (
        <TouchableOpacity style={styles.btn} onPress={resetError}>
          <Text style={styles.btnText}>Réessayer</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#B71C1C' },
  message: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 20 },
  btn: { backgroundColor: '#1056E0', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  btnText: { color: '#fff', fontWeight: '600' },
});
