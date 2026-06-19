// BookingCard (MyBookings): compact booking row for the MyBookings list
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { BookingStatusBadge } from '../../../components/booking/BookingStatusBadge';

interface BookingCardProps {
  booking: { id: string; propertyTitle: string; checkIn: string; checkOut: string; status: string; totalAmount: number };
  onPress: () => void;
}

export const BookingCard: React.FC<BookingCardProps> = ({ booking, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={styles.header}>
      <Text style={styles.title} numberOfLines={1}>{booking.propertyTitle}</Text>
      <BookingStatusBadge status={booking.status} />
    </View>
    <Text style={styles.dates}>{booking.checkIn} → {booking.checkOut}</Text>
    <Text style={styles.amount}>{(booking.totalAmount ?? 0).toLocaleString()} XOF</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: '#222', marginRight: 8 },
  dates: { fontSize: 13, color: '#666', marginBottom: 4 },
  amount: { fontSize: 14, fontWeight: '800', color: '#1056E0' },
});
