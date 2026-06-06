// RevenueChart: monthly revenue bar chart for residences
import React from 'react';
import { ChartCard } from '../../../components/dashboard/ChartCard';
import { View, Text, StyleSheet } from 'react-native';

export const RevenueChart: React.FC = () => (
  <ChartCard title="Revenus mensuels">
    <View style={styles.placeholder}><Text style={styles.txt}>Graphique — à implémenter avec react-native-chart-kit</Text></View>
  </ChartCard>
);
const styles = StyleSheet.create({ placeholder: { height: 160, justifyContent: 'center', alignItems: 'center' }, txt: { color: '#ccc', fontSize: 12 } });
