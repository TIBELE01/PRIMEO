import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useShallow } from 'zustand/react/shallow';
import type { ClientScreenProps } from '../../../navigation/types';
import { messagesApi } from '../../../services/api/endpoints/messages';
import { socketService } from '../../../services/socket/socketService';
import { useChatStore } from '../../../store/chatStore';
import { useAuthStore } from '../../../store/authStore';
import { PageHeader } from '../../../components/layout/PageHeader';

// Forme normalisée utilisée par l'écran (indépendante de la forme exacte du backend).
interface Conversation {
  bookingId: string;
  bookingStatus: string;
  propertyTitle: string;
  recipientName: string;
  recipientAvatarUrl: string | null;
  lastMessage: string;
  lastMessageAt: string | null;
  unreadCount: number;
}

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  pending_payment:           { label: 'En attente de paiement', color: '#F59E0B' },
  confirmed:                 { label: 'Confirmée',              color: '#10B981' },
  completed:                 { label: 'Terminée',               color: '#6B7280' },
  interest_expressed:        { label: 'Intérêt exprimé',        color: '#3B82F6' },
  cancelled_by_client:       { label: 'Annulée',                color: '#EF4444' },
  cancelled_by_professional: { label: 'Annulée',                color: '#EF4444' },
};

const PRO_ROLES = new Set([
  'professional_hebergement',
  'professional_hotel',
  'professional_immobilier',
  'restaurateur',
]);

// Palette d'avatars (couleur dérivée du nom pour varier visuellement).
const AVATAR_COLORS = ['#1056E0', '#D67309', '#469A0E', '#7C3AED', '#D41313', '#0891B2', '#DB2777'];

/** Coerce n'importe quelle valeur en texte affichable (objet message → .content). */
function toText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const c = o.content ?? o.text ?? o.message ?? o.title ?? o.name;
    return typeof c === 'string' ? c : '';
  }
  return '';
}

/** Extrait un nom complet depuis un participant quel que soit le nommage des champs. */
function participantName(p: unknown): string {
  if (!p || typeof p !== 'object') return '';
  const o = p as Record<string, unknown>;
  const first = o.firstName ?? o.first_name ?? '';
  const last = o.lastName ?? o.last_name ?? '';
  const full = `${first} ${last}`.trim();
  if (full) return full;
  return typeof o.name === 'string' ? o.name : '';
}

function participantAvatar(p: unknown): string | null {
  if (!p || typeof p !== 'object') return null;
  const o = p as Record<string, unknown>;
  const a = o.avatarUrl ?? o.avatar_url ?? o.avatar ?? o.photoUrl ?? o.photo;
  return typeof a === 'string' ? a : null;
}

/**
 * Normalise un objet conversation venant du backend, quelle que soit sa forme :
 * — bookingId peut s'appeler bookingId / booking_id / id / booking.id
 * — le correspondant peut être recipientName (string) ou un objet
 *   otherParticipant / recipient / client / owner / participant
 * — lastMessage peut être une string (contenu) ou l'objet message complet
 * Cela résout à la fois les avatars « ? » et l'erreur « Conversation introuvable ».
 */
function normalizeConversation(raw: any, currentUserId: string): Conversation | null {
  if (!raw || typeof raw !== 'object') return null;

  const bookingId =
    raw.bookingId ?? raw.booking_id ?? raw.id ?? raw.booking?.id ?? null;
  if (!bookingId) return null; // sans identifiant, la conversation n'est pas ouvrable

  // Correspondant : on privilégie un champ déjà résolu côté serveur ;
  // sinon, si la réponse contient client ET owner (forme booking brute),
  // on choisit la partie qui n'est pas l'utilisateur courant.
  let participant: any =
    raw.otherParticipant ?? raw.recipient ?? raw.participant ?? raw.peer ?? null;
  if (!participant) {
    const client = raw.client ?? raw.booking?.client ?? null;
    const owner = raw.owner ?? raw.property?.owner ?? raw.booking?.property?.owner ?? null;
    if (client || owner) {
      if (client && client.id === currentUserId) participant = owner;
      else if (owner && owner.id === currentUserId) participant = client;
      else participant = owner ?? client; // côté client, l'autre partie est le propriétaire
    }
  }
  participant = participant ?? raw.user ??
    (raw.recipientName && typeof raw.recipientName === 'object' ? raw.recipientName : null);

  const recipientName =
    (typeof raw.recipientName === 'string' && raw.recipientName.trim())
      ? raw.recipientName.trim()
      : participantName(participant);

  const recipientAvatarUrl =
    (typeof raw.recipientAvatarUrl === 'string' ? raw.recipientAvatarUrl : null) ??
    (typeof raw.recipientAvatar === 'string' ? raw.recipientAvatar : null) ??
    participantAvatar(participant);

  const lastMsgObj = raw.lastMessage ?? raw.lastMsg ?? raw.last_message ?? raw.messages?.[0] ?? null;
  const lastMessage = toText(lastMsgObj);
  const lastMessageAt =
    raw.lastMessageAt ?? raw.last_message_at ??
    (lastMsgObj && typeof lastMsgObj === 'object'
      ? (lastMsgObj.sentAt ?? lastMsgObj.createdAt ?? null)
      : null) ??
    raw.updatedAt ?? null;

  return {
    bookingId: String(bookingId),
    bookingStatus: String(raw.bookingStatus ?? raw.status ?? raw.booking?.status ?? ''),
    propertyTitle: toText(raw.propertyTitle ?? raw.propertyName ?? raw.property?.title ?? raw.property),
    recipientName,
    recipientAvatarUrl,
    lastMessage,
    lastMessageAt,
    unreadCount: Number(raw.unreadCount ?? raw.unread ?? raw.unread_count ?? 0) || 0,
  };
}

function avatarColor(name: string): string {
  const code = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

type Props = ClientScreenProps<'Conversations'>;

export function ConversationsScreen({ navigation }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userRole = useAuthStore(s => s.user?.role ?? 'client');
  const currentUserId = useAuthStore(s => s.user?.id ?? '');
  const isPro = PRO_ROLES.has(userRole);

  // Compteurs de non-lus locaux (messages reçus via socket non encore lus).
  const localUnreadCounts = useChatStore(
    useShallow(s => {
      const counts: Record<string, number> = {};
      for (const [id, msgs] of Object.entries(s.messages)) {
        const n = msgs.filter(m => !m.isRead).length;
        if (n > 0) counts[id] = n;
      }
      return counts;
    }),
  );

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await messagesApi.listConversations();
      const rawList = res?.data?.data ?? res?.data ?? [];
      const list = Array.isArray(rawList) ? rawList : [];
      const data = list
        .map((raw: any) => normalizeConversation(raw, currentUserId))
        .filter((c): c is Conversation => c !== null);
      data.sort(
        (a, b) => new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime(),
      );
      setConversations(data);
    } catch {
      // garde les données précédentes
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  const hasLoadedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      load(hasLoadedRef.current);
      hasLoadedRef.current = true;
      socketService.connect().catch(() => null);
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const goToChat = (conv: Conversation) => {
    navigation.navigate('Chat', {
      bookingId: conv.bookingId,
      recipientName: conv.recipientName || 'Conversation',
    });
  };

  const formatTime = (iso: string | null | undefined) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const isYear = d.getFullYear() === now.getFullYear();
    return isYear
      ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
      : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageHeader title="Messagerie" />
        <View style={styles.centered}><ActivityIndicator size="large" color="#1056E0" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PageHeader title="Messagerie" />
      <FlatList
        data={conversations}
        keyExtractor={(item, index) => item.bookingId ?? String(index)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1056E0" />}
        contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyInner}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>Aucune conversation</Text>
            <Text style={styles.emptyMsg}>Vos échanges avec les hôtes apparaîtront ici après une réservation.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const localUnread = localUnreadCounts[item.bookingId] ?? 0;
          const unread = item.unreadCount + localUnread;
          const hasUnread = unread > 0;
          const statusInfo = STATUS_INFO[item.bookingStatus];
          const name = item.recipientName || 'Correspondant';
          const initial = (name[0] ?? '?').toUpperCase();

          return (
            <TouchableOpacity
              style={[styles.row, hasUnread && styles.rowUnread]}
              onPress={() => goToChat(item)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Conversation avec ${name}${item.propertyTitle ? `, ${item.propertyTitle}` : ''}${hasUnread ? `, ${unread} message${unread > 1 ? 's' : ''} non lu${unread > 1 ? 's' : ''}` : ''}`}
              accessibilityHint="Ouvre la discussion"
            >
              {/* Avatar */}
              <View style={styles.avatarWrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                {item.recipientAvatarUrl
                  ? <Image source={{ uri: item.recipientAvatarUrl }} style={styles.avatar} />
                  : <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: avatarColor(name) }]}>
                      <Text style={styles.avatarInitial}>{initial}</Text>
                    </View>
                }
                {hasUnread && <View style={styles.unreadDot} />}
              </View>

              {/* Infos */}
              <View style={styles.info}>
                <View style={styles.topRow}>
                  <Text style={[styles.name, hasUnread && styles.nameUnread]} numberOfLines={1}>{name}</Text>
                  <Text style={[styles.time, hasUnread && styles.timeUnread]}>{formatTime(item.lastMessageAt)}</Text>
                </View>

                {!!item.propertyTitle && (
                  <Text style={styles.property} numberOfLines={1}>🏠 {item.propertyTitle}</Text>
                )}

                {isPro && statusInfo && (
                  <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}18` }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                  </View>
                )}

                <View style={styles.bottomRow}>
                  <Text style={[styles.preview, hasUnread ? styles.previewUnread : styles.previewRead]} numberOfLines={1}>
                    {item.lastMessage || 'Aucun message'}
                  </Text>
                  {hasUnread && (
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
  safe: { flex: 1, backgroundColor: '#F4F5F7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingVertical: 8, paddingBottom: 90 },
  emptyContainer: { flex: 1 },
  emptyInner: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptyMsg: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },

  // Carte conversation
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginHorizontal: 12,
    marginVertical: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  rowUnread: {
    backgroundColor: '#F0FAF4',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },

  avatarWrap: { marginRight: 14 },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: 22, fontWeight: '800' },
  unreadDot: {
    position: 'absolute', top: -2, right: -2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#10B981', borderWidth: 2, borderColor: '#fff',
  },

  info: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  name: { fontSize: 15, fontWeight: '600', color: '#374151', flex: 1, marginRight: 8 },
  nameUnread: { fontWeight: '800', color: '#0F1729' },
  time: { fontSize: 12, color: '#9CA3AF' },
  timeUnread: { color: '#10B981', fontWeight: '700' },

  property: { fontSize: 12, color: '#6B7280', marginBottom: 4 },

  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 4, gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },

  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  preview: { flex: 1, fontSize: 13 },
  previewRead: { color: '#9CA3AF', fontWeight: '400' },
  previewUnread: { color: '#1F2937', fontWeight: '600' },

  badge: { backgroundColor: '#10B981', borderRadius: 11, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  sep: { height: 0 },
});
