import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator,
  ScrollView, Image,
} from 'react-native';
import type { ClientScreenProps } from '../../../navigation/types';
import { disputesApi } from '../../../services/api/endpoints/disputes';
import { socketService } from '../../../services/socket/socketService';
import { useAuth } from '../../../hooks/useAuth';

type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'resolved_refund_full'
  | 'resolved_refund_partial'
  | 'resolved_no_refund';

interface DisputeMessage {
  id: string;
  senderId: string;
  content: string;
  sentAt: string;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    role: string;
  };
}

interface DisputeData {
  id: string;
  bookingId: string;
  reason: string;
  description: string;
  status: DisputeStatus;
  resolution?: string;
  refundAmount?: number;
  adminNotes?: string;
  createdAt: string;
  resolvedAt?: string;
  booking?: {
    property?: { id: string; title: string; coverImage?: string };
    startDate?: string;
    endDate?: string;
  };
}

const STATUS_CONFIG: Record<DisputeStatus, { label: string; color: string; icon: string; bg: string }> = {
  open:                     { label: 'Ouvert',                icon: '🔴', color: '#DC2626', bg: '#FEF2F2' },
  under_review:             { label: 'En cours d\'examen',    icon: '🔍', color: '#D97706', bg: '#FFFBEB' },
  resolved_refund_full:     { label: 'Remboursé intégralement', icon: '✅', color: '#1056E0', bg: '#F0FDF4' },
  resolved_refund_partial:  { label: 'Remboursé partiellement', icon: '🟡', color: '#D97706', bg: '#FFFBEB' },
  resolved_no_refund:       { label: 'Rejeté',               icon: '⛔', color: '#6B7280', bg: '#F9FAFB' },
};

const REASON_LABELS: Record<string, string> = {
  non_conformity: 'Non-conformité',
  payment_issue: 'Problème de paiement',
  cancellation: 'Annulation abusive',
  no_show: 'Accès impossible',
  other: 'Autre problème',
};

type Props = ClientScreenProps<'DisputeDetail'>;

export function DisputeDetailScreen({ navigation, route }: Props) {
  const { disputeId } = route.params ?? ({} as Partial<Props['route']['params']>);
  const { user } = useAuth();

  const [dispute, setDispute] = useState<DisputeData | null>(null);
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const listRef = useRef<FlatList>(null);

  const loadDispute = useCallback(async () => {
    try {
      const res = await disputesApi.getById(disputeId);
      const d = res?.data?.data ?? res?.data;
      setDispute(d);
    } catch { /* ignore */ }
  }, [disputeId]);

  const loadMessages = useCallback(async () => {
    try {
      const res = await disputesApi.getMessages(disputeId);
      const msgs: DisputeMessage[] = res?.data?.data ?? res?.data ?? [];
      setMessages(msgs);
    } catch { /* ignore */ }
  }, [disputeId]);

  useEffect(() => {
    (async () => {
      await Promise.all([loadDispute(), loadMessages()]);
      setLoading(false);
    })();
  }, [loadDispute, loadMessages]);

  // Socket.io for real-time dispute messages
  useEffect(() => {
    socketService.connect().then(() => {
      socketService.joinDisputeRoom(disputeId);
      const socket = socketService.getSocket();
      if (!socket) return;

      const handleMsg = (msg: DisputeMessage) => {
        setMessages(prev => {
          const exists = prev.some(m => m.id === msg.id);
          return exists ? prev : [...prev, msg];
        });
      };

      socket.on('receive_dispute_message', handleMsg as any);
      return () => { socket.off('receive_dispute_message', handleMsg as any); };
    });
  }, [disputeId]);

  const scrollToBottom = () => {
    if (messages.length > 0) listRef.current?.scrollToEnd({ animated: true });
  };

  useEffect(() => {
    const t = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(t);
  }, [messages.length]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      socketService.sendDisputeMessage(disputeId, content);
      setText('');
      // Optimistically add the message (socket echo will deduplicate)
      const optimistic: DisputeMessage = {
        id: `tmp-${Date.now()}`,
        senderId: user?.id ?? '',
        content,
        sentAt: new Date().toISOString(),
        sender: {
          id: user?.id ?? '',
          firstName: user?.firstName ?? '',
          lastName: user?.lastName ?? '',
          role: 'client',
        },
      };
      setMessages(prev => [...prev, optimistic]);
    } finally {
      setSending(false);
    }
  };

  const isResolved = (s?: DisputeStatus) =>
    s === 'resolved_refund_full' || s === 'resolved_refund_partial' || s === 'resolved_no_refund';

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const renderMessage = ({ item }: { item: DisputeMessage }) => {
    const isMine = item.senderId === user?.id;
    const isAdmin = item.sender?.role === 'admin';

    return (
      <View style={[styles.msgWrap, isMine ? styles.msgMine : styles.msgTheirs]}>
        {!isMine && (
          <View style={styles.senderLabel}>
            <Text style={[styles.senderName, isAdmin && styles.senderAdmin]}>
              {isAdmin ? '👤 Administration' : `${item.sender?.firstName ?? ''} ${item.sender?.lastName ?? ''}`}
            </Text>
          </View>
        )}
        <View style={[styles.bubble, isMine ? styles.bubbleMine : isAdmin ? styles.bubbleAdmin : styles.bubbleTheirs]}>
          <Text style={[styles.msgText, isMine && styles.msgTextMine]}>{item.content}</Text>
          <Text style={[styles.msgTime, isMine && styles.msgTimeMine]}>{formatTime(item.sentAt)}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Litige</Text>
        </View>
        <View style={styles.centered}><ActivityIndicator size="large" color="#DC2626" /></View>
      </SafeAreaView>
    );
  }

  const cfg = dispute ? (STATUS_CONFIG[dispute.status] ?? { label: dispute.status, color: '#9CA3AF', icon: '❓', bg: '#F9FAFB' }) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {dispute?.booking?.property?.title ?? 'Litige'}
        </Text>
        {cfg && (
          <View style={[styles.headerBadge, { backgroundColor: cfg.bg }]}>
            <Text style={styles.headerBadgeIcon}>{cfg.icon}</Text>
            <Text style={[styles.headerBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Info panel (collapsible) */}
        {!showChat && dispute && (
          <ScrollView style={styles.infoPanel} showsVerticalScrollIndicator={false}>
            {/* Property thumbnail */}
            {dispute.booking?.property?.coverImage && (
              <Image source={{ uri: dispute.booking.property.coverImage }} style={styles.cover} />
            )}

            {/* Status card */}
            {cfg && (
              <View style={[styles.statusCard, { backgroundColor: cfg.bg, borderColor: cfg.color + '40' }]}>
                <Text style={styles.statusCardIcon}>{cfg.icon}</Text>
                <View style={styles.statusCardBody}>
                  <Text style={[styles.statusCardLabel, { color: cfg.color }]}>{cfg.label}</Text>
                  <Text style={styles.statusCardDate}>
                    Ouvert le {formatDate(dispute.createdAt)}
                    {dispute.resolvedAt ? ` · Résolu le ${formatDate(dispute.resolvedAt)}` : ''}
                  </Text>
                </View>
              </View>
            )}

            {/* Resolution decision */}
            {isResolved(dispute.status) && (
              <View style={styles.resolutionCard}>
                <Text style={styles.resolutionTitle}>Décision de l'administrateur</Text>
                {dispute.resolution && <Text style={styles.resolutionText}>{dispute.resolution}</Text>}
                {dispute.refundAmount != null && dispute.refundAmount > 0 && (
                  <View style={styles.refundBox}>
                    <Text style={styles.refundLabel}>Montant remboursé</Text>
                    <Text style={styles.refundAmount}>{dispute.refundAmount.toLocaleString()} FCFA</Text>
                  </View>
                )}
                {dispute.status === 'resolved_no_refund' && (
                  <View style={[styles.refundBox, { backgroundColor: '#FEF2F2' }]}>
                    <Text style={[styles.refundLabel, { color: '#DC2626' }]}>Aucun remboursement accordé</Text>
                  </View>
                )}
              </View>
            )}

            {/* Dispute details */}
            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>Détails du litige</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Catégorie</Text>
                <Text style={styles.detailVal}>{REASON_LABELS[dispute.reason] ?? dispute.reason}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Description</Text>
                <Text style={styles.detailVal}>{dispute.description}</Text>
              </View>
              {dispute.booking?.startDate && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Séjour</Text>
                  <Text style={styles.detailVal}>
                    {new Date(dispute.booking.startDate).toLocaleDateString('fr-FR')} – {new Date(dispute.booking.endDate!).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
              )}
            </View>

            {/* Notice */}
            {!isResolved(dispute.status) && (
              <View style={styles.notice}>
                <Text style={styles.noticeIcon}>📬</Text>
                <Text style={styles.noticeText}>
                  Vous serez notifié par push et email à chaque changement de statut.
                </Text>
              </View>
            )}

            {/* Switch to chat */}
            <TouchableOpacity style={styles.chatToggleBtn} onPress={() => setShowChat(true)}>
              <Text style={styles.chatToggleIcon}>💬</Text>
              <Text style={styles.chatToggleText}>
                Messagerie avec l'administrateur
                {messages.length > 0 ? ` (${messages.length} message${messages.length > 1 ? 's' : ''})` : ''}
              </Text>
              <Text style={styles.chatToggleArrow}>→</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Chat panel */}
        {showChat && (
          <>
            <TouchableOpacity style={styles.backToInfo} onPress={() => setShowChat(false)}>
              <Text style={styles.backToInfoText}>← Détails du litige</Text>
            </TouchableOpacity>

            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={item => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.chatList}
              onContentSizeChange={scrollToBottom}
              ListEmptyComponent={
                <View style={styles.chatEmpty}>
                  <Text style={styles.chatEmptyIcon}>💬</Text>
                  <Text style={styles.chatEmptyText}>
                    Aucun message pour le moment.{'\n'}Vous pouvez envoyer un message à l'administrateur.
                  </Text>
                </View>
              }
            />

            {!isResolved(dispute?.status) && (
              <View style={styles.inputBar}>
                <TextInput
                  style={styles.input}
                  value={text}
                  onChangeText={setText}
                  placeholder="Votre message à l'administrateur..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  maxLength={1000}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
                  onPress={handleSend}
                  disabled={!text.trim() || sending}
                >
                  <Text style={styles.sendIcon}>➤</Text>
                </TouchableOpacity>
              </View>
            )}

            {isResolved(dispute?.status) && (
              <View style={styles.resolvedNotice}>
                <Text style={styles.resolvedNoticeText}>
                  Ce litige est résolu — la messagerie est fermée.
                </Text>
              </View>
            )}
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 8,
  },
  backBtn: { padding: 6 },
  backArrow: { fontSize: 22, color: '#DC2626', fontWeight: '600' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111827' },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  headerBadgeIcon: { fontSize: 12 },
  headerBadgeText: { fontSize: 11, fontWeight: '700' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  infoPanel: { flex: 1 },
  cover: { width: '100%', height: 160 },
  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    margin: 16, borderRadius: 12, padding: 14,
    borderWidth: 1,
  },
  statusCardIcon: { fontSize: 28 },
  statusCardBody: { flex: 1 },
  statusCardLabel: { fontSize: 16, fontWeight: '800' },
  statusCardDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  resolutionCard: {
    marginHorizontal: 16, marginBottom: 12, backgroundColor: '#fff', borderRadius: 12,
    padding: 14, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  resolutionTitle: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 8 },
  resolutionText: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 10 },
  refundBox: { backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refundLabel: { fontSize: 13, color: '#065F46', fontWeight: '600' },
  refundAmount: { fontSize: 18, fontWeight: '800', color: '#1056E0' },
  detailCard: {
    marginHorizontal: 16, marginBottom: 12, backgroundColor: '#fff', borderRadius: 12,
    padding: 14, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  detailTitle: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 10 },
  detailRow: { marginBottom: 8 },
  detailKey: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
  detailVal: { fontSize: 14, color: '#374151', lineHeight: 20 },
  notice: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginBottom: 12, backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, alignItems: 'center' },
  noticeIcon: { fontSize: 16 },
  noticeText: { flex: 1, fontSize: 12, color: '#1D4ED8', lineHeight: 17 },
  chatToggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 24, backgroundColor: '#fff', borderRadius: 12,
    padding: 14, borderWidth: 1.5, borderColor: '#DC2626',
  },
  chatToggleIcon: { fontSize: 20 },
  chatToggleText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#DC2626' },
  chatToggleArrow: { fontSize: 16, color: '#DC2626' },
  backToInfo: { padding: 12, paddingLeft: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backToInfoText: { fontSize: 13, color: '#DC2626', fontWeight: '600' },
  chatList: { padding: 12, gap: 6 },
  chatEmpty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  chatEmptyIcon: { fontSize: 40 },
  chatEmptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  msgWrap: { marginVertical: 3 },
  msgMine: { alignItems: 'flex-end' },
  msgTheirs: { alignItems: 'flex-start' },
  senderLabel: { marginBottom: 2, marginLeft: 4 },
  senderName: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  senderAdmin: { color: '#DC2626' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleMine: { backgroundColor: '#DC2626', borderBottomRightRadius: 4 },
  bubbleAdmin: { backgroundColor: '#FEE2E2', borderBottomLeftRadius: 4 },
  bubbleTheirs: { backgroundColor: '#F3F4F6', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 14, color: '#111827', lineHeight: 20 },
  msgTextMine: { color: '#fff' },
  msgTime: { fontSize: 11, color: '#9CA3AF', marginTop: 4, textAlign: 'right' },
  msgTimeMine: { color: 'rgba(255,255,255,0.7)' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', padding: 10, gap: 8,
    borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#fff',
  },
  input: {
    flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, color: '#111827',
    maxHeight: 100, backgroundColor: '#FAFAFA',
  },
  sendBtn: { backgroundColor: '#DC2626', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#FECACA' },
  sendIcon: { color: '#fff', fontSize: 16 },
  resolvedNotice: { padding: 14, backgroundColor: '#F9FAFB', borderTopWidth: 1, borderTopColor: '#F3F4F6', alignItems: 'center' },
  resolvedNoticeText: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
});
