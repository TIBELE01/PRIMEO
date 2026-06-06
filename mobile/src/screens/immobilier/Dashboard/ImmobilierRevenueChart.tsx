import React from 'react'; import { ChartCard } from '../../../components/dashboard/ChartCard'; import { View, Text, StyleSheet } from 'react-native';
export const ImmobilierRevenueChart: React.FC = () => (<ChartCard title="Revenus immobilier"><View style={styles.ph}><Text style={styles.t}>Graphique à implémenter</Text></View></ChartCard>);
const styles = StyleSheet.create({ ph: { height: 140, justifyContent: 'center', alignItems: 'center' }, t: { color: '#ccc', fontSize: 12 } });
