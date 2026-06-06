// ResidenceBookingDetailScreen: full booking detail with accept/decline actions
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';

export default function ResidenceBookingDetailScreen({ route }: any) {
  return <ScreenWrapper><ScrollView contentContainerStyle={styles.content}><Text style={styles.placeholder}>Détail réservation #{route.params?.bookingId}</Text></ScrollView></ScreenWrapper>;
}
const styles = StyleSheet.create({ content: { padding: 20 }, placeholder: { color: '#999', fontSize: 14 } });
