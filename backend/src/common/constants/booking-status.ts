// Booking lifecycle states
export const BookingStatus = {
  PENDING: 'pending',            // Awaiting host confirmation
  CONFIRMED: 'confirmed',        // Confirmed by host
  CANCELLED_CLIENT: 'cancelled_client',    // Cancelled by client
  CANCELLED_PROFESSIONAL: 'cancelled_professional', // Cancelled by pro
  COMPLETED: 'completed',        // Stay/service completed
  DISPUTED: 'disputed',          // Under admin dispute
} as const;

export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

// Terminal states — bookings in these states cannot transition further
export const TERMINAL_STATUSES: BookingStatus[] = [
  BookingStatus.CANCELLED_CLIENT,
  BookingStatus.CANCELLED_PROFESSIONAL,
  BookingStatus.COMPLETED,
];
