export type TicketStatus   = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketCategory = 'technique' | 'litige' | 'information' | 'reclamation';
export type TicketPriority = 'haute' | 'normale' | 'basse';

export interface TicketMessage {
  id: string;
  content: string;
  isStaff: boolean;
  authorName?: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  messages?: TicketMessage[];
}
