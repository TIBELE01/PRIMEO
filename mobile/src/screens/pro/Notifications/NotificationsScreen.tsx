import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { notificationsApi } from '../../../services/api/endpoints/notificationsApi';
import { useProTheme } from '../../../hooks/useProTheme';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

// Icône selon le type de notification
function notifIcon(type: string): React.ComponentProps<typeof Ionicons>['name'] {
  if (type.startsWith('booking')) return 'calendar';
  if (type.startsWith('payment')) return 'card';
  if (type.startsWith('review')) return 'star';
  if (type.startsWith('boost')) return 'rocket';
  if (type.startsWith('subscription')) return 'shield-checkmark';
  if (type === 'property_interest') return 'home';
  return 'notifications';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `il y a ${diffD}j`;
  return d.toLocaleDateString('fr-CI', { day: 'numeric', month: 'short' });
}

export default function NotificationsScreen() {
  const theme = useProTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await notificationsApi.list(1);
      const d = res.data?.data ?? res.data;
      setNotifications(d.data ?? []);
      setUnread(d.unread ?? 0);
    } catch {
      // silencieux
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnread((u) => Math.max(0, u - 1));
    await notificationsApi.markRead(id).catch(() => null);
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    await notificationsApi.markAllRead().catch(() => null);
  }, []);

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[s.item, !item.isRead && s.itemUnread]}
      onPress={() => !item.isRead && handleMarkRead(item.id)}
      activeOpacity={0.75}
    >
      <View style={[s.iconWrap, { backgroundColor: theme.primary + '18' }]}>
        <Ionicons name={notifIcon(item.type)} size={20} color={theme.primary} />
      </View>
      <View style={s.content}>
        <Text style={[s.title, !item.isRead && s.titleUnread]}>{item.title}</Text>
        <Text style={s.body} numberOfLines={2}>{item.body}</Text>
        <Text style={s.time}>{formatDate(item.createdAt)}</Text>
      </View>
      {!item.isRead && <View style={[s.dot, { backgroundColor: theme.primary }]} />}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* En-tête */}
      <View style={[s.header, { backgroundColor: theme.primary }]}>
        <Text style={s.headerTitle}>Notifications</Text>
        {unread > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={s.markAllBtn}>
            <Text style={s.markAllText}>Tout lire</Text>
          </TouchableOpacity>
        )}
      </View>

      {unread > 0 && (
        <View style={[s.unreadBadge, { backgroundColor: theme.primary + '14' }]}>
          <Text style={[s.unreadText, { color: theme.primary }]}>
            {unread} non lue{unread > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={notifications.length === 0 ? s.emptyContainer : { paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => load(true)}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="notifications-off-outline" size={56} color="#CBD5E1" />
            <Text style={s.emptyTitle}>Aucune notification</Text>
            <Text style={s.emptyBody}>Vos alertes de réservation, paiements et boosts apparaîtront ici.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 18,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  markAllBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8 },
  markAllText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  unreadBadge: { marginHorizontal: 16, marginTop: 12, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  unreadText:  { fontSize: 12, fontWeight: '700' },

  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  itemUnread: { backgroundColor: '#F0F6FF' },

  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },

  content: { flex: 1 },
  title:   { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 3 },
  titleUnread: { fontWeight: '700', color: '#111827' },
  body:    { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  time:    { fontSize: 11, color: '#9CA3AF', marginTop: 4 },

  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },

  emptyContainer: { flex: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#374151' },
  emptyBody:  { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
});
