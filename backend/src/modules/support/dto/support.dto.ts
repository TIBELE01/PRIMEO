// Zod DTOs for support endpoints
import { z } from 'zod';

export const CreateTicketDto = z.object({
  subject:     z.string().min(5).max(200),
  description: z.string().min(20).max(2000),
  category:    z.enum(['technical', 'dispute', 'information', 'complaint']),
  attachments: z.array(z.string().url()).max(5).optional().default([]),
});
export type CreateTicketInput = z.infer<typeof CreateTicketDto>;

export const AddCommentDto = z.object({
  content: z.string().min(1).max(2000),
});
export type AddCommentInput = z.infer<typeof AddCommentDto>;

export const AdminAddCommentDto = z.object({
  content:    z.string().min(1).max(2000),
  isInternal: z.boolean().optional().default(false),
});
export type AdminAddCommentInput = z.infer<typeof AdminAddCommentDto>;

export const AssignTicketDto = z.object({
  assigneeId: z.string().cuid(),
});
export type AssignTicketInput = z.infer<typeof AssignTicketDto>;

export const ChangeStatusDto = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
});
export type ChangeStatusInput = z.infer<typeof ChangeStatusDto>;

export const AdminListTicketsDto = z.object({
  status:   z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  category: z.enum(['technical', 'dispute', 'information', 'complaint']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  page:     z.coerce.number().int().min(1).optional().default(1),
  limit:    z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type AdminListTicketsInput = z.infer<typeof AdminListTicketsDto>;

export const ChatbotDto = z.object({
  query:     z.string().min(1).max(500),
  sessionId: z.string().min(1).max(128),
});
export type ChatbotInput = z.infer<typeof ChatbotDto>;
