// PropertyPerformanceChart: per-property performance metrics chart
import React from 'react';
import { ChartCard } from '../../../components/dashboard/ChartCard';
import { View, Text, StyleSheet } from 'react-native';

export const PropertyPerformanceChart: React.FC = () => (
  <ChartCard title="Performance par propriété">
    <View style={styles.ph}><Text style={styles.t}>Graphique — à implémenter</Text></View>
  </ChartCard>
);
const styles = StyleSheet.create({ ph: { height: 180, justifyContent: 'center', alignItems: 'center' }, t: { color: '#ccc', fontSize: 12 } });
