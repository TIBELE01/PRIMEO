// Message, Conversation types

export interface MessageSender {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface Message {
  id: string;
  bookingId: string;
  senderId: string;
  sender: MessageSender;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  bookingId: string;
  propertyName: string;
  propertyImage: string | null;
  otherParticipant: MessageSender;
  lastMessage: Message | null;
  unreadCount: number;
  updatedAt: string;
}
