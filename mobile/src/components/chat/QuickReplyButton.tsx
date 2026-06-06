// QuickReplyButton: tappable suggestion chip to pre-fill the message input
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface QuickReplyButtonProps {
  label: string;
  onPress: () => void;
}

export const QuickReplyButton: React.FC<QuickReplyButtonProps> = ({ label, onPress }) => {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress}>
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: { borderWidth: 1, borderColor: '#1056E0', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  text: { color: '#1056E0', fontSize: 13 },
});
