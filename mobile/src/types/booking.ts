// Booking, BookingStatus, PaymentOption types

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'disputed';

export type PaymentOption =
  | 'full'
  | 'partial';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded';

export interface BookingGuest {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface BookingProperty {
  id: string;
  name: string;
  city: string;
  images: { url: string }[];
}

export interface Booking {
  id: string;
  propertyId: string;
  property: BookingProperty;
  guestId: string;
  guest: BookingGuest;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentOption: PaymentOption;
  pricePerNight: number;
  totalPrice: number;
  amountPaid: number;
  amountDue: number;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingPayload {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  paymentOption: PaymentOption;
}
