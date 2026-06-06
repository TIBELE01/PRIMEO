// ChatHeader: top bar showing conversation participant name and online status
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ChatHeaderProps {
  name: string;
  avatar?: string;
  isOnline?: boolean;
  onBack: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ name, isOnline, onBack }) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.back}><Text style={styles.backIcon}>←</Text></TouchableOpacity>
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        {isOnline !== undefined && <Text style={[styles.status, { color: isOnline ? '#3A6BF0' : '#999' }]}>{isOnline ? 'En ligne' : 'Hors ligne'}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#1056E0' },
  back: { marginRight: 12 },
  backIcon: { color: '#fff', fontSize: 22 },
  info: {},
  name: { color: '#fff', fontSize: 16, fontWeight: '700' },
  status: { fontSize: 12 },
});
