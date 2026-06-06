// MediaStep: step in the Add Property wizard (residence)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MediaStepProps {
  data: Record<string, any>;
  onChange: (key: string, value: any) => void;
  errors?: Record<string, string>;
}

export const MediaStep: React.FC<MediaStepProps> = ({ data, onChange, errors }) => (
  <View style={styles.container}>
    <Text style={styles.placeholder}>MediaStep — formulaire à implémenter</Text>
  </View>
);

const styles = StyleSheet.create({ container: { padding: 16 }, placeholder: { color: '#999', fontSize: 13 } });
