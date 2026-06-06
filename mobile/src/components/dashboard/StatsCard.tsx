// StatsCard: revenue / occupancy stats summary card
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatsCardProps {
  title: string;
  stats: { label: string; value: string }[];
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, stats }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {stats.map((s, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.label}>{s.label}</Text>
          <Text style={styles.value}>{s.value}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 2, marginBottom: 12 },
  title: { fontSize: 15, fontWeight: '700', color: '#1056E0', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  label: { fontSize: 13, color: '#666' },
  value: { fontSize: 13, fontWeight: '600', color: '#333' },
});
