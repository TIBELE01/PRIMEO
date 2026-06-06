// PropertyFeaturesList: grid of property feature chips (beds, baths, area, etc.)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Feature { icon: string; label: string; value: string }

export const PropertyFeaturesList: React.FC<{ features: Feature[] }> = ({ features }) => (
  <View style={styles.grid}>
    {features.map((f, i) => (
      <View key={i} style={styles.item}>
        <Text style={styles.icon}>{f.icon}</Text>
        <Text style={styles.value}>{f.value}</Text>
        <Text style={styles.label}>{f.label}</Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  item: { alignItems: 'center', backgroundColor: '#f9f9f9', borderRadius: 10, padding: 12, minWidth: 70 },
  icon: { fontSize: 22, marginBottom: 4 },
  value: { fontWeight: '700', fontSize: 14, color: '#1056E0' },
  label: { fontSize: 11, color: '#777', marginTop: 2 },
});
