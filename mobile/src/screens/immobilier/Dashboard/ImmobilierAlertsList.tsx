import React from 'react'; import { View, Text, StyleSheet } from 'react-native';
export const ImmobilierAlertsList: React.FC = () => (<View style={styles.c}><Text style={styles.t}>Alertes immobilier</Text></View>);
const styles = StyleSheet.create({ c: { backgroundColor: '#fff', borderRadius: 12, padding: 16 }, t: { color: '#999', fontSize: 13 } });
