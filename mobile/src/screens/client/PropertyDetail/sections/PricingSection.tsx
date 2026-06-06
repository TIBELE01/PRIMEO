// PricingSection: property detail section component
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PricingSectionProps {
  property: any;
  [key: string]: any;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ property }) => (
  <View style={styles.container}>
    <Text style={styles.placeholder}>PricingSection — {property?.id}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { padding: 16 },
  placeholder: { color: '#999', fontSize: 13 },
});
