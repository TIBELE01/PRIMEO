// Hotel booking entity — includes property details for hôtellerie sector
import type { Booking, Property } from '@prisma/client';

export type HotelBookingEntity = Booking & {
  property: Pick<Property, 'id' | 'title' | 'propertyType' | 'city' | 'street'>;
};
