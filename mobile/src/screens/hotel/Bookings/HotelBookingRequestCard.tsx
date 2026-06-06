import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
export const HotelBookingRequestCard: React.FC<{ booking: any; onAccept: () => void; onDecline: () => void }> = ({ booking, onAccept, onDecline }) => (
  <View style={styles.card}>
    <Text style={styles.name}>{booking.clientName}</Text>
    <View style={styles.row}>
      <TouchableOpacity style={styles.decline} onPress={onDecline}><Text style={styles.dt}>Refuser</Text></TouchableOpacity>
      <TouchableOpacity style={styles.accept} onPress={onAccept}><Text style={styles.at}>Accepter</Text></TouchableOpacity>
    </View>
  </View>
);
const styles = StyleSheet.create({ card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2 }, name: { fontWeight: '700', fontSize: 15, marginBottom: 10 }, row: { flexDirection: 'row', gap: 10 }, decline: { flex: 1, borderWidth: 1, borderColor: '#B71C1C', borderRadius: 8, padding: 10, alignItems: 'center' }, dt: { color: '#B71C1C', fontWeight: '600' }, accept: { flex: 1, backgroundColor: '#1056E0', borderRadius: 8, padding: 10, alignItems: 'center' }, at: { color: '#fff', fontWeight: '700' } });
