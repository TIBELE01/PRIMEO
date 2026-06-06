// PriceBreakdown: itemized price line component
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PriceBreakdownProps {
  items: { label: string; amount: number }[];
  currency?: string;
}

export const PriceBreakdown: React.FC<PriceBreakdownProps> = ({ items, currency = 'XOF' }) => {
  return (
    <View style={styles.container}>
      {items.map((item, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.amount}>{item.amount.toLocaleString()} {currency}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: '#555', fontSize: 14 },
  amount: { color: '#333', fontSize: 14, fontWeight: '500' },
});
