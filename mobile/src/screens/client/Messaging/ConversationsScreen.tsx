import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { ClientScreenProps } from '../../../navigation/types';
import { messagesApi } from '../../../services/api/endpoints/messages';
import { socketService } from '../../../services/socket/socketService';
import { useChatStore } from '../../../store/chatStore';

interface Conversation {
  bookingId: string;
  propertyName: string;
  propertyImage?: string;
  recipientName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

type Props = ClientScreenProps<'Conversations'>;

export function ConversationsScreen({ navigation }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const messages = useChatStore(s => s.messages);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await messagesApi.listConversations();
      const data: Conversation[] = res?.data?.data ?? res?.data ?? [];
      const sorted = [...data].sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
      );
      setConversations(sorted);
    } catch {
      // keep stale data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Rafraîchir à chaque retour sur l'onglet : les écrans des tabs restent montés,
  // sinon une discussion ouverte après une réservation n'apparaîtrait pas ici.
  const hasLoadedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      load(hasLoadedRef.current);
      hasLoadedRef.current = true;
      socketService.connect();
    }, [load]),
  );

  // Re-sort when new messages arrive via socket
  useEffect(() => {
    setConversations(prev =>
      [...prev].sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
      ),
    );
  }, [messages]);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const goToChat = (conv: Conversation) => {
    navigation.navigate('Chat', {
      bookingId: conv.bookingId,
      recipientName: conv.recipientName,
    });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}><Text style={styles.title}>Messagerie</Text></View>
        <View style={styles.centered}><ActivityIndicator size="large" color="#1056E0" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}><Text style={styles.title}>Messagerie</Text></View>
      <FlatList
        data={conversations}
        keyExtractor={item => item.bookingId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1056E0" />}
        contentContainerStyle={conversations.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          <View style={styles.emptyInner}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>Aucune conversation</Text>
            <Text style={styles.emptyMsg}>Vos échanges avec les hôtes apparaîtront ici après une réservation.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const localUnread = (messages[item.bookingId] ?? []).filter(m => !m.isRead).length;
          const unread = item.unreadCount + localUnread;
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => goToChat(item)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Conversation avec ${item.recipientName}${item.propertyName ? `, ${item.propertyName}` : ''}${unread > 0 ? `, ${unread} message${unread > 1 ? 's' : ''} non lu${unread > 1 ? 's' : ''}` : ''}`}
              accessibilityHint="Ouvre la discussion"
            >
              <View style={styles.avatarWrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                {item.propertyImage
                  ? <Image source={{ uri: item.propertyImage }} style={styles.avatar} />
                  : <View style={[styles.avatar, styles.avatarFallback]}>
                      <Text style={styles.avatarInitial}>{item.recipientName[0]?.toUpperCase()}</Text>
                    </View>
                }
              </View>
              <View style={styles.info}>
                <View style={styles.topRow}>
                  <Text style={styles.name} numberOfLines={1}>{item.recipientName}</Text>
                  <Text style={styles.time}>{formatTime(item.lastMessageAt)}</Text>
                </View>
                <Text style={styles.property} numberOfLines={1}>{item.propertyName}</Text>
                <View style={styles.bottomRow}>
                  <Text style={[styles.preview, unread > 0 && styles.previewBold]} numberOfLines={1}>
                    {item.lastMessage}
                  </Text>
                  {unread > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1 },
  emptyInner: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptyMsg: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff' },
  avatarWrap: { marginRight: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: { backgroundColor: '#1056E0', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: 20, fontWeight: '700' },
  info: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  time: { fontSize: 12, color: '#9CA3AF' },
  property: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  preview: { flex: 1, fontSize: 13, color: '#6B7280' },
  previewBold: { fontWeight: '600', color: '#111827' },
  badge: { backgroundColor: '#1056E0', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  sep: { height: 1, backgroundColor: '#F9FAFB', marginLeft: 80 },
});
