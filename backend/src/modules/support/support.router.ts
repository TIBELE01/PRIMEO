// Support routes — chatbot, tickets (user + admin)
import { Router } from 'express';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { authorize } from '../../common/middleware/roles.middleware';
import { validate } from '../../common/validators/validation.middleware';
import {
  CreateTicketDto,
  AddCommentDto,
  ChatbotDto,
} from './dto/support.dto';
import {
  chatbot,
  createTicket,
  listMyTickets,
  getTicket,
  addUserComment,
  adminListTickets,
  adminGetTicket,
  adminAssignTicket,
  adminChangeStatus,
  adminAddComment,
  adminGetStats,
  adminGetChatbotStats,
  adminGetChatbotConversations,
  adminGetUnansweredQuestions,
  adminGetChatbotFaq,
  adminUpdateChatbotFaq,
} from './support.controller';

export const supportRouter = Router();

// ── Chatbot (authenticated) ────────────────────────────────────────────────────
supportRouter.post('/chatbot', authenticate, validate(ChatbotDto), chatbot);

// ── User ticket routes ─────────────────────────────────────────────────────────
supportRouter.get('/me',                 authenticate, listMyTickets);
supportRouter.post('/',                  authenticate, validate(CreateTicketDto), createTicket);
supportRouter.get('/:id',               authenticate, getTicket);
supportRouter.post('/:id/comments',     authenticate, validate(AddCommentDto), addUserComment);

// ── Admin ticket routes ────────────────────────────────────────────────────────
supportRouter.get( '/admin/stats',                      authenticate, authorize('admin'), adminGetStats);
supportRouter.get( '/admin/tickets',                    authenticate, authorize('admin'), adminListTickets);
supportRouter.get( '/admin/tickets/:id',                authenticate, authorize('admin'), adminGetTicket);
supportRouter.patch('/admin/tickets/:id/assign',        authenticate, authorize('admin'), adminAssignTicket);
supportRouter.patch('/admin/tickets/:id/status',        authenticate, authorize('admin'), adminChangeStatus);
supportRouter.post( '/admin/tickets/:id/comments',      authenticate, authorize('admin'), adminAddComment);

// ── Chatbot admin routes ───────────────────────────────────────────────────────
supportRouter.get( '/admin/chatbot/stats',              authenticate, authorize('admin'), adminGetChatbotStats);
supportRouter.get( '/admin/chatbot/conversations',      authenticate, authorize('admin'), adminGetChatbotConversations);
supportRouter.get( '/admin/chatbot/unanswered',         authenticate, authorize('admin'), adminGetUnansweredQuestions);
supportRouter.get( '/admin/chatbot/faq',                authenticate, authorize('admin'), adminGetChatbotFaq);
supportRouter.put( '/admin/chatbot/faq',                authenticate, authorize('admin'), adminUpdateChatbotFaq);
