// ChatInput: message composer bar with send button
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Votre message..."
        multiline
        maxLength={500}
      />
      <TouchableOpacity style={[styles.sendBtn, (!text.trim() || disabled) && styles.disabled]} onPress={handleSend} disabled={!text.trim() || disabled}>
        <Text style={styles.sendIcon}>➤</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  input: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, maxHeight: 120, fontSize: 14, marginRight: 8 },
  sendBtn: { backgroundColor: '#1056E0', borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  disabled: { backgroundColor: '#ccc' },
  sendIcon: { color: '#fff', fontSize: 16 },
});
