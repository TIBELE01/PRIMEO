// CalendarStep: step in the Add Property wizard (residence)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CalendarStepProps {
  data: Record<string, any>;
  onChange: (key: string, value: any) => void;
  errors?: Record<string, string>;
}

export const CalendarStep: React.FC<CalendarStepProps> = ({ data, onChange, errors }) => (
  <View style={styles.container}>
    <Text style={styles.placeholder}>CalendarStep — formulaire à implémenter</Text>
  </View>
);

const styles = StyleSheet.create({ container: { padding: 16 }, placeholder: { color: '#999', fontSize: 13 } });
