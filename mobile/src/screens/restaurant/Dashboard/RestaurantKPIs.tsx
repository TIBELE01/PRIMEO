import React from 'react'; import { View, StyleSheet } from 'react-native'; import { KPICard } from '../../../components/dashboard/KPICard';
export const RestaurantKPIs: React.FC = () => (<View style={styles.r}><KPICard title="Réservations" value="0" icon="🍽️" /><KPICard title="Revenus" value="0 XOF" icon="💰" /></View>);
const styles = StyleSheet.create({ r: { flexDirection: 'row', gap: 12 } });
