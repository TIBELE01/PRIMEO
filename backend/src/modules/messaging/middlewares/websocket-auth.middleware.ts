// WebSocket auth middleware — Supabase JWT verification for Socket.io connections
import { Socket } from 'socket.io';
import { supabaseAdmin } from '../../../config/supabase.config';

export async function wsAuthMiddleware(socket: Socket, next: (err?: Error) => void): Promise<void> {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error('Authentication required'));
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return next(new Error('Invalid token'));
    (socket as Socket & { userId: string }).userId = user.id;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
}
