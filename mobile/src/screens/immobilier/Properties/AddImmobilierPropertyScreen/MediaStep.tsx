import React from 'react'; import { View, Text, StyleSheet } from 'react-native';
export const MediaStep: React.FC<{ data: any; onChange: any; errors?: any }> = () => (<View style={styles.c}><Text style={styles.t}>MediaStep (Immobilier)</Text></View>);
const styles = StyleSheet.create({ c: { padding: 16 }, t: { color: '#999', fontSize: 13 } });
