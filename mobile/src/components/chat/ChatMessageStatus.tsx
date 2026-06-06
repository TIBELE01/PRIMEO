// ChatMessageStatus: sent / delivered / read checkmark indicator
import React from 'react';
import { Text, StyleSheet } from 'react-native';

type Status = 'sent' | 'delivered' | 'read';

export const ChatMessageStatus: React.FC<{ status: Status }> = ({ status }) => {
  const icon = status === 'read' ? '✓✓' : status === 'delivered' ? '✓✓' : '✓';
  const color = status === 'read' ? '#00c8ff' : '#aaa';
  return <Text style={[styles.text, { color }]}>{icon}</Text>;
};

const styles = StyleSheet.create({
  text: { fontSize: 11, marginLeft: 4 },
});
