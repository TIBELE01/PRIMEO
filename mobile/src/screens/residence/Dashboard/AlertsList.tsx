// AlertsList: pending action alerts on residence dashboard
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const AlertsList: React.FC = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Alertes</Text>
    <Text style={styles.empty}>Aucune alerte en cours</Text>
  </View>
);
const styles = StyleSheet.create({ container: { backgroundColor: '#fff', borderRadius: 12, padding: 16 }, title: { fontWeight: '700', fontSize: 15, color: '#1056E0', marginBottom: 8 }, empty: { color: '#999', fontSize: 13 } });
