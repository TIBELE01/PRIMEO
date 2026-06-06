import React from 'react'; import { View, Text, StyleSheet } from 'react-native';
export const BasicInfoStep: React.FC<{ data: any; onChange: any; errors?: any }> = () => (<View style={styles.c}><Text style={styles.t}>BasicInfoStep (Hôtel)</Text></View>);
const styles = StyleSheet.create({ c: { padding: 16 }, t: { color: '#999', fontSize: 13 } });
