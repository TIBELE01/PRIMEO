// Partial update DTO for bookings (e.g., special requests)
import { z } from 'zod';

export const UpdateBookingDto = z.object({
  specialRequests: z.string().max(500).optional(),
  guestCount: z.number().int().min(1).max(50).optional(),
});
export type UpdateBookingInput = z.infer<typeof UpdateBookingDto>;
