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
    set(state => {
      const curr = state.messages[bookingId];
      // No-op when list is empty or every message is already read — avoids
      // creating a new array reference that would trigger Zustand re-renders.
      if (!curr?.length || curr.every(m => m.isRead)) return state;
      return {
        messages: {
          ...state.messages,
          [bookingId]: curr.map(m => (m.isRead ? m : { ...m, isRead: true })),
        },
      };
    }),
}));
