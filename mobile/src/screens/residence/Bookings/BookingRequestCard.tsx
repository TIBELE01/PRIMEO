// BookingRequestCard: pending booking request with accept/decline buttons
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface BookingRequestCardProps {
  booking: any;
  onAccept: () => void;
  onDecline: () => void;
}

export const BookingRequestCard: React.FC<BookingRequestCardProps> = ({ booking, onAccept, onDecline }) => (
  <View style={styles.card}>
    <Text style={styles.title}>{booking.clientName}</Text>
    <Text style={styles.dates}>{booking.checkIn} → {booking.checkOut}</Text>
    <View style={styles.row}>
      <TouchableOpacity style={styles.decline} onPress={onDecline}><Text style={styles.declineText}>Refuser</Text></TouchableOpacity>
      <TouchableOpacity style={styles.accept} onPress={onAccept}><Text style={styles.acceptText}>Accepter</Text></TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2 },
  title: { fontWeight: '700', fontSize: 15, marginBottom: 4 },
  dates: { fontSize: 13, color: '#777', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  decline: { flex: 1, borderWidth: 1, borderColor: '#B71C1C', borderRadius: 8, padding: 10, alignItems: 'center' },
  declineText: { color: '#B71C1C', fontWeight: '600' },
  accept: { flex: 1, backgroundColor: '#1056E0', borderRadius: 8, padding: 10, alignItems: 'center' },
  acceptText: { color: '#fff', fontWeight: '700' },
});
