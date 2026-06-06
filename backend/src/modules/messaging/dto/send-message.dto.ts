// DTO for REST send-message (primary path is Socket.io)
import { z } from 'zod';

export const SendMessageDto = z.object({
  bookingId: z.string().cuid(),
  content: z.string().min(1).max(2000),
});
export type SendMessageInput = z.infer<typeof SendMessageDto>;
