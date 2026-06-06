// Shared booking types
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled_client'
  | 'cancelled_professional'
  | 'completed'
  | 'disputed';

export type PaymentOption = 'full_online' | 'ten_percent_online' | 'zero_online';

export interface BookingSummary {
  id: string;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  totalPrice: number;
  depositAmount: number;
  paymentOption: PaymentOption;
  status: BookingStatus;
  createdAt: string;
}
