// Bookings list and selected booking state (Zustand)
import { create } from 'zustand';

export interface Booking {
  id: string;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalPrice: number;
}

interface BookingsState {
  bookings: Booking[];
  selectedBooking: Booking | null;
  isLoading: boolean;
  setBookings: (bookings: Booking[]) => void;
  setSelected: (booking: Booking | null) => void;
  setSelectedBooking: (booking: Booking | null) => void; // alias for useBooking hook compat
  setLoading: (v: boolean) => void;
}

export const useBookingsStore = create<BookingsState>(set => ({
  bookings: [],
  selectedBooking: null,
  isLoading: false,
  setBookings: bookings => set({ bookings }),
  setSelected: selectedBooking => set({ selectedBooking }),
  setSelectedBooking: selectedBooking => set({ selectedBooking }),
  setLoading: isLoading => set({ isLoading }),
}));
