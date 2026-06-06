// RulesStep: step in the Add Property wizard (residence)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface RulesStepProps {
  data: Record<string, any>;
  onChange: (key: string, value: any) => void;
  errors?: Record<string, string>;
}

export const RulesStep: React.FC<RulesStepProps> = ({ data, onChange, errors }) => (
  <View style={styles.container}>
    <Text style={styles.placeholder}>RulesStep — formulaire à implémenter</Text>
  </View>
);

const styles = StyleSheet.create({ container: { padding: 16 }, placeholder: { color: '#999', fontSize: 13 } });
