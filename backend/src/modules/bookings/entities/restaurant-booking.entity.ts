// Restaurant booking entity — covers table reservation context
import type { Booking, Property } from '@prisma/client';

export type RestaurantBookingEntity = Booking & {
  property: Pick<Property, 'id' | 'title' | 'propertyType' | 'city'>;
};
