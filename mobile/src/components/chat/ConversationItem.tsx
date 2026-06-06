import React, { useRef } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Animated, Platform } from 'react-native';

interface ConversationItemProps {
  name: string;
  lastMessage: string;
  sentAt: string;
  unreadCount?: number;
  onPress: () => void;
}

const AVATAR_COLORS = ['#1056E0', '#D67309', '#469A0E', '#7C3AED', '#D41313', '#0891B2'];

export const ConversationItem: React.FC<ConversationItemProps> = ({ name, lastMessage, sentAt, unreadCount, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const nd = Platform.OS !== 'web';
  const avatarBg = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  const hasUnread = !!unreadCount && unreadCount > 0;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={styles.item}
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.98, speed: 50, bounciness: 2, useNativeDriver: nd }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, speed: 50, bounciness: 2, useNativeDriver: nd }).start()}
        activeOpacity={1}
      >
        <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
          <Text style={styles.initials}>{name[0].toUpperCase()}</Text>
        </View>
        <View style={styles.content}>
          <View style={styles.row}>
            <Text style={[styles.name, hasUnread && styles.nameUnread]} numberOfLines={1}>{name}</Text>
            <Text style={[styles.time, hasUnread && styles.timeUnread]}>{sentAt}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.preview, hasUnread && styles.previewUnread]} numberOfLines={1}>{lastMessage}</Text>
            {hasUnread && (
              <View style={styles.badge}>
                <Text style={styles.badgeTxt}>{unreadCount! > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  initials: { color: '#fff', fontSize: 18, fontWeight: '800' },
  content: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontWeight: '600', fontSize: 15, color: '#334155', flex: 1, marginRight: 8 },
  nameUnread: { fontWeight: '800', color: '#0F1729' },
  time: { fontSize: 11, color: '#94A3B8' },
  timeUnread: { color: '#1056E0', fontWeight: '600' },
  preview: { flex: 1, fontSize: 13, color: '#94A3B8', marginRight: 8 },
  previewUnread: { color: '#475569', fontWeight: '500' },
  badge: {
    backgroundColor: '#1056E0',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
