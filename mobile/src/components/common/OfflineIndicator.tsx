// OfflineIndicator: small badge shown in the header when offline
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const OfflineIndicator: React.FC = () => (
  <View style={styles.badge}>
    <Text style={styles.text}>Hors ligne</Text>
  </View>
);

const styles = StyleSheet.create({
  badge: { backgroundColor: '#B71C1C', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  text: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
