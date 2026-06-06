// CancellationPolicy: displays the property cancellation policy text
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CancellationPolicyProps {
  policy: string;
}

export const CancellationPolicy: React.FC<CancellationPolicyProps> = ({ policy }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Politique d'annulation</Text>
      <Text style={styles.text}>{policy}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#FFF8E1', borderRadius: 10 },
  title: { fontWeight: '700', fontSize: 14, color: '#D67309', marginBottom: 6 },
  text: { fontSize: 13, color: '#555', lineHeight: 20 },
});
