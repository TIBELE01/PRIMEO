// SubscriptionStatusBadge: badge coloré indiquant la formule d'abonnement
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PLAN_COLORS: Record<string, string> = {
  starter:    '#78909C',
  business:   '#D67309',
  entreprise: '#1056E0',
};

const PLAN_LABELS: Record<string, string> = {
  starter:    'Starter',
  business:   'Business',
  entreprise: 'Entreprise',
};

export const SubscriptionStatusBadge: React.FC<{ plan: string }> = ({ plan }) => {
  const key = plan.toLowerCase();
  const color = PLAN_COLORS[key] ?? '#78909C';
  const label = PLAN_LABELS[key] ?? plan;
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start' },
  text: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
