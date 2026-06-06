// AlertCard: urgent action items on the professional dashboard
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface AlertCardProps {
  type: 'booking_request' | 'kyc_pending' | 'low_rating' | 'boost_expiring' | 'listing_update';
  message: string;
  onAction: () => void;
  actionLabel: string;
}

const ALERT_COLORS: Record<string, string> = {
  booking_request: '#D67309', kyc_pending: '#B71C1C', low_rating: '#E64A19', boost_expiring: '#0277BD', listing_update: '#7C3AED',
};

export const AlertCard: React.FC<AlertCardProps> = ({ type, message, onAction, actionLabel }) => {
  return (
    <View style={[styles.card, { borderLeftColor: ALERT_COLORS[type] ?? '#999' }]}>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity onPress={onAction}><Text style={[styles.action, { color: ALERT_COLORS[type] }]}>{actionLabel}</Text></TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14, borderLeftWidth: 4, marginBottom: 8, elevation: 1 },
  message: { fontSize: 13, color: '#444', marginBottom: 6 },
  action: { fontSize: 13, fontWeight: '700' },
});
