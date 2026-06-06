// ChartCard: wrapper card for chart components (revenue, occupancy)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, children }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 2, marginBottom: 16 },
  title: { fontSize: 15, fontWeight: '700', color: '#1056E0', marginBottom: 12 },
});
