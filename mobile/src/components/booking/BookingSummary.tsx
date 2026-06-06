// BookingSummary: detailed cost summary shown before payment
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BookingSummaryProps {
  nights: number;
  pricePerNight: number;
  serviceFee: number;
  totalAmount: number;
  currency?: string;
}

export const BookingSummary: React.FC<BookingSummaryProps> = ({ nights, pricePerNight, serviceFee, totalAmount, currency = 'XOF' }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Récapitulatif</Text>
      <View style={styles.row}><Text>Prix/nuit × {nights}</Text><Text>{(pricePerNight * nights).toLocaleString()} {currency}</Text></View>
      <View style={styles.row}><Text>Frais de service</Text><Text>{serviceFee.toLocaleString()} {currency}</Text></View>
      <View style={[styles.row, styles.total]}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>{totalAmount.toLocaleString()} {currency}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#1056E0' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  total: { borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 8, marginTop: 4 },
  totalLabel: { fontWeight: '700', fontSize: 15 },
  totalAmount: { fontWeight: '700', fontSize: 15, color: '#1056E0' },
});
