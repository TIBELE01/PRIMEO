// KPICards: residence dashboard KPI row (revenue, bookings, occupancy, rating)
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { KPICard } from '../../../components/dashboard/KPICard';

export const KPICards: React.FC = () => (
  <View style={styles.row}>
    <KPICard title="Revenus (mois)" value="0 XOF" icon="💰" trend="neutral" />
    <KPICard title="Réservations" value="0" icon="📅" trend="neutral" />
  </View>
);
const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 12 } });
