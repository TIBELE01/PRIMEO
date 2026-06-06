// BoostManagementScreen: manage active and past boosts for residence properties
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';

export default function BoostManagementScreen() {
  return <ScreenWrapper><View style={styles.c}><Text style={styles.t}>Gestion des boosts</Text></View></ScreenWrapper>;
}
const styles = StyleSheet.create({ c: { flex: 1, justifyContent: 'center', alignItems: 'center' }, t: { fontSize: 16, color: '#999' } });
