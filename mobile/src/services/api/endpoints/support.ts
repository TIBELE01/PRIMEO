// Support — tickets de l'utilisateur. L'API utilise ses propres valeurs (technical, dispute,
// information, complaint ; low/medium/high/urgent) et renvoie les échanges sous `comments` :
// cette couche fait la correspondance avec les types de l'application et renvoie des données
// prêtes à afficher (et non la réponse HTTP brute).
import { apiClient } from '../client';
import type { TicketCategory, TicketPriority, SupportTicket, TicketMessage } from '../../../types/support';

const CATEGORY_TO_API: Record<TicketCategory, string> = {
  technique: 'technical', litige: 'dispute', information: 'information', reclamation: 'complaint',
};
const CATEGORY_FROM_API: Record<string, TicketCategory> = {
  technical: 'technique', dispute: 'litige', information: 'information', complaint: 'reclamation',
};
const PRIORITY_FROM_API: Record<string, TicketPriority> = {
  low: 'basse', medium: 'normale', high: 'haute', urgent: 'haute',
};

type ApiComment = {
  id: string; content: string; authorId: string; isInternal?: boolean; createdAt: string;
  author?: { id: string; firstName?: string; lastName?: string } | null;
};
type ApiTicket = {
  id: string; userId?: string; subject: string; description?: string; category: string; status: SupportTicket['status'];
  priority: string; createdAt: string; updatedAt: string; comments?: ApiComment[];
};

function toTicket(t: ApiTicket): SupportTicket {
  const messages: TicketMessage[] = (t.comments ?? [])
    .filter((c) => !c.isInternal) // notes internes de l'équipe : jamais affichées à l'utilisateur
    .map((c) => ({
      id: c.id,
      content: c.content,
      isStaff: !!t.userId && c.authorId !== t.userId,
      authorName: c.author ? `${c.author.firstName ?? ''} ${c.author.lastName ?? ''}`.trim() : undefined,
      createdAt: c.createdAt,
    }));
  return {
    id: t.id,
    subject: t.subject,
    description: t.description ?? '',
    category: CATEGORY_FROM_API[t.category] ?? (t.category as TicketCategory),
    status: t.status,
    priority: PRIORITY_FROM_API[t.priority] ?? 'normale',
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    messages,
  };
}

export const supportApi = {
  createTicket: (data: { subject: string; description: string; category: TicketCategory | 'complaint' }) =>
    apiClient.post('/support', {
      ...data,
      category: CATEGORY_TO_API[data.category as TicketCategory] ?? data.category,
    }),
  getMyTickets: async (): Promise<SupportTicket[]> => {
    const { data } = await apiClient.get('/support/me', { params: { limit: 50 } });
    const list: ApiTicket[] = Array.isArray(data) ? data : (data?.data ?? data?.tickets ?? []);
    return list.map(toTicket);
  },
  getTicket: async (id: string): Promise<SupportTicket> => {
    const { data } = await apiClient.get(`/support/${id}`);
    return toTicket((data?.data ?? data) as ApiTicket);
  },
  addMessage: (id: string, content: string) => apiClient.post(`/support/${id}/comments`, { content }),
};
