import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending_payment:           { label: 'En attente',    color: '#D67309', bg: '#FDF7EE' },
  confirmed:                 { label: 'Confirmée',      color: '#1056E0', bg: '#EFF5FF' },
  cancelled_by_client:       { label: 'Annulée',        color: '#D41313', bg: '#FEF2F2' },
  cancelled_by_professional: { label: 'Annulée (hôte)', color: '#7C3AED', bg: '#F5F3FF' },
  completed:                 { label: 'Terminée',       color: '#469A0E', bg: '#F3FCE8' },
};

export const BookingStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = CONFIG[status] ?? { label: status, color: '#64748B', bg: '#F1F5F9' };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <View style={[styles.dot, { backgroundColor: cfg.color }]} />
      <Text style={[styles.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  text: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
});
