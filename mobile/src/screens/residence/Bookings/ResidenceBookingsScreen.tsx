// ResidenceBookingsScreen: list of incoming bookings for residence professionals
import React, { useEffect } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useBooking } from '../../../hooks/useBooking';
import { BookingCard } from '../../../components/booking/BookingCard';

export default function ResidenceBookingsScreen({ navigation }: any) {
  const { bookings, fetchMyBookings } = useBooking();
  useEffect(() => { fetchMyBookings(); }, []);
  return (
    <ScreenWrapper>
      <FlatList
        data={bookings}
        keyExtractor={b => (b as any).id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="📅" title="Aucune réservation" subtitle="Les réservations apparaîtront ici" />}
        renderItem={({ item }) => <BookingCard booking={item as any} onPress={() => navigation.navigate('BookingDetail', { bookingId: (item as any).id })} />}
      />
    </ScreenWrapper>
  );
}
const styles = StyleSheet.create({ list: { padding: 16 } });
