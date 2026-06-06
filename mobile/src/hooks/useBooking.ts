// useBooking: fetch and manage bookings for the current user
import { useCallback } from 'react';
import { useBookingsStore } from '../store/bookingsStore';
import { bookingsApi } from '../services/api/endpoints/bookings';

export const useBooking = () => {
  const bookings = useBookingsStore(s => s.bookings);
  const selectedBooking = useBookingsStore(s => s.selectedBooking);
  const setBookings = useBookingsStore(s => s.setBookings);
  const setSelected = useBookingsStore(s => s.setSelectedBooking);

  const fetchMyBookings = useCallback(async () => {
    const res = await bookingsApi.getMyBookings();
    setBookings(res.data.data ?? []);
  }, []);

  const fetchBooking = useCallback(async (id: string) => {
    const res = await bookingsApi.getById(id);
    setSelected(res.data.data);
  }, []);

  return { bookings, selectedBooking, fetchMyBookings, fetchBooking };
};
