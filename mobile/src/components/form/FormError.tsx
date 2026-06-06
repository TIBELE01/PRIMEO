// FormError: standalone error message block for form-level errors
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const FormError: React.FC<{ message: string }> = ({ message }) => (
  <View style={styles.container}>
    <Text style={styles.text}>⚠️ {message}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { backgroundColor: '#FFEBEE', borderRadius: 8, padding: 12, marginBottom: 12 },
  text: { color: '#B71C1C', fontSize: 13 },
});
