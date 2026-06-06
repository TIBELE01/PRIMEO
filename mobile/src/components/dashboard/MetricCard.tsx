// MetricCard: single numeric metric with optional sparkline
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MetricCardProps {
  label: string;
  value: number | string;
  unit?: string;
  color?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, unit, color = '#1056E0' }) => {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color }]}>{value}{unit ? ` ${unit}` : ''}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14, alignItems: 'center', flex: 1, elevation: 1 },
  value: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  label: { fontSize: 12, color: '#777', textAlign: 'center' },
});
