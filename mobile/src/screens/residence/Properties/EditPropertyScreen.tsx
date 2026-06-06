// EditPropertyScreen: edit an existing residence property listing
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';

export default function EditPropertyScreen({ route }: any) {
  return <ScreenWrapper><View style={styles.c}><Text style={styles.t}>Éditer propriété #{route.params?.propertyId}</Text></View></ScreenWrapper>;
}
const styles = StyleSheet.create({ c: { flex: 1, justifyContent: 'center', alignItems: 'center' }, t: { color: '#999' } });
