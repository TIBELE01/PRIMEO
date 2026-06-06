// Socket.io client — real-time messaging with /chat namespace and JWT auth
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { useChatStore } from '../../store/chatStore';

const BASE_URL: string = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3000';

let socket: Socket | null = null;

export const socketService = {
  connect: async () => {
    if (socket?.connected) return;
    const token = await SecureStore.getItemAsync('accessToken');
    if (!token) return;

    socket = io(`${BASE_URL}/chat`, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => console.log('Socket connected:', socket?.id));
    socket.on('disconnect', reason => console.log('Socket disconnected:', reason));
    socket.on('receive_message', message => {
      useChatStore.getState().addMessage(message.bookingId, message);
    });
    socket.on('error', err => console.error('Socket error:', err));
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
