// BookingConfirmationCard: success card shown after booking is confirmed
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BookingConfirmationCardProps {
  bookingId: string;
  propertyTitle: string;
  checkIn: string;
  checkOut: string;
  amountPaid: number;
}

export const BookingConfirmationCard: React.FC<BookingConfirmationCardProps> = ({ bookingId, propertyTitle, checkIn, checkOut, amountPaid }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.icon}>✅</Text>
      <Text style={styles.title}>Réservation confirmée</Text>
      <Text style={styles.id}>Ref: {bookingId}</Text>
      <Text style={styles.property}>{propertyTitle}</Text>
      <Text style={styles.dates}>{checkIn} → {checkOut}</Text>
      <Text style={styles.amount}>{amountPaid.toLocaleString()} XOF payés</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#EFF5FF', borderRadius: 16, padding: 24, alignItems: 'center' },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#1056E0', marginBottom: 4 },
  id: { fontSize: 12, color: '#777', marginBottom: 8 },
  property: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  dates: { fontSize: 14, color: '#555', marginBottom: 8 },
  amount: { fontSize: 15, fontWeight: '700', color: '#1056E0' },
});
