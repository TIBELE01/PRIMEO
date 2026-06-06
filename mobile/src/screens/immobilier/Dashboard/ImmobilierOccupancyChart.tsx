import React from 'react'; import { ChartCard } from '../../../components/dashboard/ChartCard'; import { View, Text, StyleSheet } from 'react-native';
export const ImmobilierOccupancyChart: React.FC = () => (<ChartCard title="Taux d'occupation"><View style={styles.ph}><Text style={styles.t}>Graphique à implémenter</Text></View></ChartCard>);
const styles = StyleSheet.create({ ph: { height: 120, justifyContent: 'center', alignItems: 'center' }, t: { color: '#ccc', fontSize: 12 } });
