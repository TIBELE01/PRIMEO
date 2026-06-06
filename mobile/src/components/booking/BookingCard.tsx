import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Platform } from 'react-native';
import { BookingStatusBadge } from './BookingStatusBadge';

interface BookingCardProps {
  booking: { id: string; propertyTitle: string; checkIn: string; checkOut: string; status: string; totalAmount: number };
  onPress: () => void;
}

const STATUS_BAR_COLOR: Record<string, string> = {
  pending_payment: '#D67309',
  confirmed: '#1056E0',
  cancelled_by_client: '#D41313',
  cancelled_by_professional: '#7C3AED',
  completed: '#469A0E',
};

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return s;
  }
}

export const BookingCard: React.FC<BookingCardProps> = ({ booking, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const nd = Platform.OS !== 'web';
  const barColor = STATUS_BAR_COLOR[booking.status] ?? '#94A3B8';

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
      <View style={[styles.bar, { backgroundColor: barColor }]} />
      <TouchableOpacity
        style={styles.inner}
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, speed: 50, bounciness: 2, useNativeDriver: nd }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, speed: 50, bounciness: 2, useNativeDriver: nd }).start()}
        activeOpacity={1}
      >
        <Text style={styles.title} numberOfLines={2}>{booking.propertyTitle}</Text>
        <View style={styles.dateRow}>
          <Text style={styles.dateIcon}>📅 </Text>
          <Text style={styles.dateTxt}>{fmtDate(booking.checkIn)} → {fmtDate(booking.checkOut)}</Text>
        </View>
        <View style={styles.foot}>
          <BookingStatusBadge status={booking.status} />
          <Text style={styles.amount}>{booking.totalAmount.toLocaleString('fr-FR')} XOF</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#0F1729',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 5,
  },
  bar: { width: 5 },
  inner: { flex: 1, padding: 14 },
  title: { fontSize: 15, fontWeight: '700', color: '#0F1729', marginBottom: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dateIcon: { fontSize: 13 },
  dateTxt: { fontSize: 13, color: '#64748B' },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: 15, fontWeight: '800', color: '#0F1729' },
});
