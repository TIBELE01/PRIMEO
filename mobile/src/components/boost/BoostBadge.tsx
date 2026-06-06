// BoostBadge: flame icon badge shown on boosted property cards
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BoostBadgeProps {
  expiresAt: string;
}

export const BoostBadge: React.FC<BoostBadgeProps> = ({ expiresAt }) => {
  return (
    <View style={styles.badge}>
      <Text style={styles.icon}>🔥</Text>
      <Text style={styles.text}>Boosté</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D67309', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
  icon: { fontSize: 12 },
  text: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
