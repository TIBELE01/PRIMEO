import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MessageBubbleProps {
  content: string;
  sentAt: string;
  isMine: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ content, sentAt, isMine }) => {
  const timeStr = new Date(sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.container, isMine ? styles.mine : styles.theirs]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.text, isMine ? styles.textMine : styles.textTheirs]}>{content}</Text>
        <Text style={[styles.time, isMine ? styles.timeMine : styles.timeTheirs]}>{timeStr}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: 3, paddingHorizontal: 14 },
  mine: { alignItems: 'flex-end' },
  theirs: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#0F1729',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  bubbleMine: {
    backgroundColor: '#1056E0',
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 4,
  },
  text: { fontSize: 15, lineHeight: 22 },
  textMine: { color: '#fff' },
  textTheirs: { color: '#0F1729' },
  time: { fontSize: 10, marginTop: 5, textAlign: 'right' },
  timeMine: { color: 'rgba(255,255,255,0.6)' },
  timeTheirs: { color: '#94A3B8' },
});
