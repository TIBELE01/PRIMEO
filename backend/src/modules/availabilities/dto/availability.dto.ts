// Zod DTOs for availability endpoints
import { z } from 'zod';

// Set / update availability for a date range (seasonal pricing, unblocking)
export const SetAvailabilityDto = z.object({
  startDate: z.string().date(),
  endDate: z.string().date(),
  isAvailable: z.boolean(),
  price: z.number().int().positive().optional(),
});

// Manually block a date range
export const BlockDatesDto = z.object({
  startDate: z.string().date(),
  endDate: z.string().date(),
  reason: z.string().max(255).optional(),
});
