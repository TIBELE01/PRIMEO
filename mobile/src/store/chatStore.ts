// Chat messages and conversations state (Zustand)
import { create } from 'zustand';

export interface Message {
  id: string;
  bookingId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender?: { firstName: string; lastName: string; avatarUrl: string | null };
}

interface ChatState {
  messages: Record<string, Message[]>; // keyed by bookingId
  addMessage: (bookingId: string, message: Message) => void;
  setMessages: (bookingId: string, messages: Message[]) => void;
  markRead: (bookingId: string) => void;
}

export const useChatStore = create<ChatState>(set => ({
  messages: {},
  addMessage: (bookingId, message) =>
    set(state => ({
      messages: {
        ...state.messages,
        [bookingId]: [...(state.messages[bookingId] ?? []), message],
      },
    })),
  setMessages: (bookingId, messages) =>
    set(state => ({ messages: { ...state.messages, [bookingId]: messages } })),
  markRead: bookingId =>
    set(state => ({
      messages: {
        ...state.messages,
        [bookingId]: (state.messages[bookingId] ?? []).map(m => ({ ...m, isRead: true })),
      },
    })),
}));
