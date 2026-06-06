// PlanComparisonTable: feature comparison grid across all three plans
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

const PLANS = ['Essentiel', 'Prestige', 'Premium'];
const FEATURES = [
  { label: 'Prix/mois', values: ['Gratuit', '9 000 XOF', '24 000 XOF'] },
  { label: 'Commission', values: ['9%', '5%', '0%'] },
  { label: 'Boosts gratuits', values: ['0', '2/mois (3j)', '10/mois (7j)'] },
  { label: 'Photos max', values: ['5', '15', 'Illimité'] },
  { label: 'Visibilité', values: ['Standard', 'Élevée', 'Premium'] },
  { label: 'Support', values: ['Email', 'Prioritaire', 'Dédié'] },
];

export const PlanComparisonTable: React.FC = () => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    <View>
      <View style={styles.headerRow}>
        <View style={styles.featureCell} />
        {PLANS.map(p => <View key={p} style={styles.planHeader}><Text style={styles.planName}>{p}</Text></View>)}
      </View>
      {FEATURES.map((f, i) => (
        <View key={i} style={[styles.row, i % 2 === 0 && styles.altRow]}>
          <View style={styles.featureCell}><Text style={styles.featureLabel}>{f.label}</Text></View>
          {f.values.map((v, j) => <View key={j} style={styles.valueCell}><Text style={styles.valueText}>{v}</Text></View>)}
        </View>
      ))}
    </View>
  </ScrollView>
);

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', backgroundColor: '#1056E0' },
  featureCell: { width: 130, padding: 10 },
  planHeader: { width: 110, padding: 10, alignItems: 'center' },
  planName: { color: '#fff', fontWeight: '800', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center' },
  altRow: { backgroundColor: '#f9f9f9' },
  featureLabel: { fontSize: 12, color: '#555' },
  valueCell: { width: 110, padding: 10, alignItems: 'center' },
  valueText: { fontSize: 12, color: '#333', textAlign: 'center' },
});
