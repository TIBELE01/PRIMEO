import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
export const HotelAlertsList: React.FC = () => (
  <View style={styles.c}><Text style={styles.t}>Alertes hôtel</Text></View>
);
const styles = StyleSheet.create({ c: { backgroundColor: '#fff', borderRadius: 12, padding: 16 }, t: { color: '#999', fontSize: 13 } });
