// ResidenceSettingsScreen: residence professional settings
import React from 'react';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { View, Text, StyleSheet } from 'react-native';

export default function ResidenceSettingsScreen() {
  return <ScreenWrapper><View style={styles.c}><Text style={styles.t}>Paramètres résidence</Text></View></ScreenWrapper>;
}
const styles = StyleSheet.create({ c: { flex: 1, justifyContent: 'center', alignItems: 'center' }, t: { color: '#999' } });
