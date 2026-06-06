// useMessages: subscribe to chat messages for a specific booking
import { useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import { socketService } from '../services/socket/socketService';

export const useMessages = (bookingId: string) => {
  const messages = useChatStore(s => s.messages[bookingId] ?? []);
  const addMessage = useChatStore(s => s.addMessage);
  const markRead = useChatStore(s => s.markRead);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !bookingId) return;
    socket.emit('join_room', { bookingId });
    const handleMessage = (msg: any) => addMessage(bookingId, msg);
    socket.on('receive_message', handleMessage);
    markRead(bookingId);
    return () => {
      socket.off('receive_message', handleMessage);
      socket.emit('leave_room', { bookingId });
    };
  }, [bookingId]);

  return { messages };
};
