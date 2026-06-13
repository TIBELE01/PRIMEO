// Messaging REST routes — history and read state (real-time via Socket.io /chat)
import { Router } from 'express';
import { listConversations, getConversation, markAsRead, listTemplates, createTemplate, updateTemplate, deleteTemplate } from './messaging.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';

export const messagesRouter = Router();

messagesRouter.use(authenticate);

// Réponses rapides : génériques (clients) / personnalisables (pros, CRUD)
messagesRouter.get('/templates', listTemplates);
messagesRouter.post('/templates', createTemplate);
messagesRouter.put('/templates/:id', updateTemplate);
messagesRouter.delete('/templates/:id', deleteTemplate);

// List all conversations (bookings with messages) for the authenticated user
messagesRouter.get('/conversations', listConversations);

// Conversation history for a specific booking (paginated)
messagesRouter.get('/booking/:bookingId', getConversation);

// Mark all unread messages from the other party as read
messagesRouter.post('/booking/:bookingId/read', markAsRead);
