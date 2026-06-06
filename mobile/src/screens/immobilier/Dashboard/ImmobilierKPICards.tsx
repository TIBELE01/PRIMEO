import React from 'react'; import { View, StyleSheet } from 'react-native'; import { KPICard } from '../../../components/dashboard/KPICard';
export const ImmobilierKPICards: React.FC = () => (<View style={styles.row}><KPICard title="Revenus" value="0 XOF" icon="🏢" /><KPICard title="Locations" value="0" icon="🔑" /></View>);
const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 12 } });
