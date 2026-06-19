// Socket.io client — real-time messaging with /chat namespace and JWT auth
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { useChatStore } from '../../store/chatStore';

const BASE_URL: string = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3000';

let socket: Socket | null = null;
// Guard against concurrent connect() calls — multiple callers (tabs, screens) can call
// connect() at the same time; without this flag a second call sees socket===null (not yet
// assigned) and creates a second Socket, causing duplicate global handlers.
let connecting = false;

export const socketService = {
  connect: async () => {
    if (socket?.connected || connecting) return;
    connecting = true;
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) { connecting = false; return; }

      socket = io(`${BASE_URL}/chat`, {
        auth: { token },
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socket.on('connect', () => { connecting = false; console.log('Socket connected:', socket?.id); });
      socket.on('connect_error', () => { connecting = false; });
      socket.on('disconnect', reason => console.log('Socket disconnected:', reason));
      // Global handler — adds incoming messages to the store for ALL open screens.
      // ChatScreen subscribes to the store and does NOT register its own receive_message
      // listener, preventing the double-add bug (message appearing twice).
      socket.on('receive_message', (message: any) => {
        useChatStore.getState().addMessage(message.bookingId, {
          ...message,
          createdAt: message.createdAt ?? message.sentAt,
        });
      });
      socket.on('error', err => { connecting = false; console.error('Socket error:', err); });
    } catch (err) {
      connecting = false;
      console.warn('[Socket] connect failed:', err);
    }
  },

  disconnect: () => {
    socket?.disconnect();
    socket = null;
  },

  getSocket: (): Socket | null => socket,

  joinRoom: (bookingId: string) => {
    socket?.emit('join_room', bookingId);
  },

  sendMessage: (bookingId: string, content: string) => {
    socket?.emit('send_message', { bookingId, content });
  },

  sendTyping: (bookingId: string, isTyping: boolean) => {
    socket?.emit('typing', { bookingId, isTyping });
  },

  markRead: (bookingId: string) => {
    socket?.emit('message_read', { bookingId });
  },

  joinDisputeRoom: (disputeId: string) => {
    socket?.emit('join_dispute_room', disputeId);
  },

  sendDisputeMessage: (disputeId: string, content: string) => {
    socket?.emit('send_dispute_message', { disputeId, content });
  },

  isConnected: () => socket?.connected ?? false,
};

export const connectSocket = socketService.connect;
export const disconnectSocket = socketService.disconnect;
export const joinRoom = socketService.joinRoom;
export const sendMessage = socketService.sendMessage;
