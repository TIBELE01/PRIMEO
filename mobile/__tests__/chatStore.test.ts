// Unit tests for chatStore — validates the critical anti-infinite-loop behaviors
import { useChatStore } from '../src/store/chatStore';

function getState() {
  return useChatStore.getState();
}

function resetStore() {
  useChatStore.setState({ messages: {} });
}

const msg1 = { id: 'm1', bookingId: 'b1', senderId: 'u1', content: 'Bonjour', isRead: false, createdAt: '2026-06-17T10:00:00Z' };
const msg2 = { id: 'm2', bookingId: 'b1', senderId: 'u2', content: 'Salut', isRead: false, createdAt: '2026-06-17T10:01:00Z' };
const msg3 = { id: 'm3', bookingId: 'b2', senderId: 'u1', content: 'Hey', isRead: true,  createdAt: '2026-06-17T10:02:00Z' };

beforeEach(resetStore);

describe('chatStore — addMessage', () => {
  it('adds a message to the correct bookingId bucket', () => {
    getState().addMessage('b1', msg1);
    expect(getState().messages['b1']).toHaveLength(1);
    expect(getState().messages['b1'][0]).toBe(msg1);
  });

  it('appends multiple messages in order', () => {
    getState().addMessage('b1', msg1);
    getState().addMessage('b1', msg2);
    expect(getState().messages['b1']).toHaveLength(2);
    expect(getState().messages['b1'][1]).toBe(msg2);
  });

  it('keeps separate buckets per bookingId', () => {
    getState().addMessage('b1', msg1);
    getState().addMessage('b2', msg3);
    expect(getState().messages['b1']).toHaveLength(1);
    expect(getState().messages['b2']).toHaveLength(1);
  });
});

describe('chatStore — setMessages', () => {
  it('replaces the entire bucket for a bookingId', () => {
    getState().addMessage('b1', msg1);
    getState().setMessages('b1', [msg2]);
    expect(getState().messages['b1']).toHaveLength(1);
    expect(getState().messages['b1'][0]).toBe(msg2);
  });
});

describe('chatStore — markRead (anti-infinite-loop behavior)', () => {
  it('returns the same state reference when the bucket is empty', () => {
    const before = getState();
    getState().markRead('b1'); // no messages for b1
    // Same state reference — no store update triggered
    expect(getState()).toBe(before);
  });

  it('returns the same state reference when all messages are already read', () => {
    getState().setMessages('b1', [{ ...msg1, isRead: true }, { ...msg2, isRead: true }]);
    const before = getState();
    getState().markRead('b1');
    // No-op: state reference must be the SAME object (no spread, no re-render)
    expect(getState()).toBe(before);
  });

  it('marks all messages as read when some are unread', () => {
    getState().setMessages('b1', [msg1, msg2]); // both isRead: false
    getState().markRead('b1');
    const msgs = getState().messages['b1'];
    expect(msgs.every(m => m.isRead)).toBe(true);
  });

  it('preserves already-read message references (no unnecessary spread)', () => {
    const readMsg = { ...msg1, isRead: true };
    const unreadMsg = { ...msg2, isRead: false };
    getState().setMessages('b1', [readMsg, unreadMsg]);
    getState().markRead('b1');
    const msgs = getState().messages['b1'];
    // The already-read message should be the SAME object reference (no unnecessary spread)
    expect(msgs[0]).toBe(readMsg);
    // The unread message gets a new object with isRead: true
    expect(msgs[1]).not.toBe(unreadMsg);
    expect(msgs[1].isRead).toBe(true);
  });

  it('does not affect other bookingId buckets', () => {
    getState().setMessages('b1', [msg1]);
    getState().setMessages('b2', [msg3]);
    const b2Before = getState().messages['b2'];
    getState().markRead('b1');
    // b2 bucket must be the exact same reference
    expect(getState().messages['b2']).toBe(b2Before);
  });
});

describe('chatStore — EMPTY_MESSAGES selector stability', () => {
  it('selector returns same reference when no messages for that bookingId', () => {
    // Simulate what ChatScreen does: useChatStore(s => s.messages[id] ?? EMPTY_MESSAGES)
    const EMPTY: never[] = [];
    const select = (s: ReturnType<typeof getState>) => s.messages['nonexistent'] ?? EMPTY;
    const ref1 = select(getState());
    const ref2 = select(getState());
    // Same EMPTY reference — Object.is(ref1, ref2) === true → no re-render
    expect(ref1).toBe(ref2);
  });
});
