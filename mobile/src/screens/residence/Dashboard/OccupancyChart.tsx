// OccupancyChart: occupancy rate trend chart
import React from 'react';
import { ChartCard } from '../../../components/dashboard/ChartCard';
import { View, Text, StyleSheet } from 'react-native';

export const OccupancyChart: React.FC = () => (
  <ChartCard title="Taux d'occupation">
    <View style={styles.placeholder}><Text style={styles.txt}>Graphique — à implémenter</Text></View>
  </ChartCard>
);
const styles = StyleSheet.create({ placeholder: { height: 120, justifyContent: 'center', alignItems: 'center' }, txt: { color: '#ccc', fontSize: 12 } });
