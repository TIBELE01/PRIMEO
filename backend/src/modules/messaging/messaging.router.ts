// Messaging REST routes — history and read state (real-time via Socket.io /chat)
import { Router } from 'express';
import multer from 'multer';
import { listConversations, getConversation, markAsRead, listTemplates, createTemplate, updateTemplate, deleteTemplate, uploadAttachment, reportMessage } from './messaging.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';

export const messagesRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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

// Image jointe à une conversation (participants uniquement)
messagesRouter.post('/booking/:bookingId/attachments', upload.single('file'), uploadAttachment);

// Signalement d'un message reçu (crée un ticket support « réclamation »)
messagesRouter.post('/:messageId/report', reportMessage);
