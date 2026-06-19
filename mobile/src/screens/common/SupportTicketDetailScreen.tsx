import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supportApi } from '../../services/api/endpoints/support';
import type { SupportTicket, TicketMessage, TicketStatus, TicketCategory, TicketPriority } from '../../types/support';

// ── Display helpers ───────────────────────────────────────────────────────────

const STATUS_CFG: Record<TicketStatus, { label: string; bg: string; color: string }> = {
  open:        { label: 'Ouvert',    bg: '#EFF5FF', color: '#1056E0' },
  in_progress: { label: 'En cours', bg: '#FDF7EE', color: '#D67309' },
  resolved:    { label: 'Résolu',   bg: '#F3FCE8', color: '#469A0E' },
  closed:      { label: 'Fermé',    bg: '#F1F5F9', color: '#64748B' },
};

const CAT_LABELS: Record<TicketCategory, string> = {
  technique:   '🔧 Technique',
  litige:      '⚖️ Litige',
  information: 'ℹ️ Information',
  reclamation: '📢 Réclamation',
};

const PRI_CFG: Record<TicketPriority, { label: string; color: string }> = {
  haute:   { label: '⚠️ Haute',   color: '#D41313' },
  normale: { label: 'Normale',   color: '#D67309' },
  basse:   { label: 'Basse',     color: '#469A0E' },
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MsgBubble({ msg }: { msg: TicketMessage }) {
  const isStaff = msg.isStaff;
  return (
    <View style={[s.bubble, isStaff ? s.bubbleStaff : s.bubbleUser]}>
      {isStaff && (
        <Text style={s.staffLabel}>Support Primeo{msg.authorName ? ` · ${msg.authorName}` : ''}</Text>
      )}
      <Text style={[s.bubbleText, isStaff ? s.textStaff : s.textUser]}>{msg.content}</Text>
      <Text style={[s.bubbleTime, isStaff ? s.timeStaff : s.timeUser]}>{fmtDateTime(msg.createdAt)}</Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function SupportTicketDetailScreen() {
  const navigation        = useNavigation<any>();
  const route             = useRoute<any>();
  const { ticketId = '' } = (route.params ?? {}) as { ticketId?: string };
  const flatRef           = useRef<FlatList>(null);

  const [ticket, setTicket]     = useState<SupportTicket | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [reply, setReply]       = useState('');
  const [sending, setSending]   = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const data = await supportApi.getTicket(ticketId);
      setTicket(data as unknown as SupportTicket);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => { load(); }, [load]);

  const handleSend = useCallback(async () => {
    const text = reply.trim();
    if (!text || !ticket) return;
    if (ticket.status === 'closed') {
      Alert.alert('Ticket fermé', 'Ce ticket est fermé. Vous ne pouvez plus y répondre.');
      return;
    }
    setSending(true);
    try {
      await supportApi.addMessage(ticketId, text);
      setReply('');
      await load();
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 200);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'envoyer votre message. Reessayez.');
    } finally {
      setSending(false);
    }
  }, [reply, ticket, ticketId, load]);

  const canReply = ticket && ticket.status !== 'closed';

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#0F1729" />
          </TouchableOpacity>
          <Text style={s.headerText}>Ticket de support</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={s.center}><ActivityIndicator size="large" color="#1056E0" /></View>
      </SafeAreaView>
    );
  }

  if (error || !ticket) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#0F1729" />
          </TouchableOpacity>
          <Text style={s.headerText}>Ticket de support</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={s.center}>
          <Text style={s.errorText}>Impossible de charger ce ticket.</Text>
          <TouchableOpacity style={s.retryBtn} onPress={load}>
            <Text style={s.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const st  = STATUS_CFG[ticket.status]   ?? STATUS_CFG.open;
  const pri = PRI_CFG[ticket.priority]    ?? PRI_CFG.normale;
  const messages: TicketMessage[] = ticket.messages ?? [];

  // Prepend initial description as first "user" message
  const allMsgs: TicketMessage[] = [
    { id: '__desc__', content: ticket.description, isStaff: false, createdAt: ticket.createdAt },
    ...messages,
  ];

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color="#0F1729" />
        </TouchableOpacity>
        <Text style={s.headerText} numberOfLines={1}>#{String(ticketId ?? '').slice(0, 8)}</Text>
        <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
          <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>

      {/* Ticket info card */}
      <View style={s.infoCard}>
        <Text style={s.infoSubject} numberOfLines={2}>{ticket.subject}</Text>
        <View style={s.infoBadges}>
          <View style={s.catBadge}><Text style={s.catText}>{CAT_LABELS[ticket.category] ?? ticket.category}</Text></View>
          <Text style={[s.priLabel, { color: pri.color }]}>{pri.label}</Text>
          <Text style={s.infoDate}>Créé le {fmtDateTime(ticket.createdAt)}</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <FlatList
          ref={flatRef}
          data={allMsgs}
          keyExtractor={(m, i) => m.id ?? String(i)}
          contentContainerStyle={s.msgList}
          renderItem={({ item }) => <MsgBubble msg={item} />}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        />

        {canReply ? (
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              value={reply}
              onChangeText={setReply}
              placeholder="Votre réponse…"
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[s.sendBtn, (!reply.trim() || sending) && s.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!reply.trim() || sending}
              activeOpacity={0.8}
            >
              {sending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="send" size={18} color="#fff" />
              }
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.closedBanner}>
            <Text style={s.closedText}>Ce ticket est fermé. Ouvrez un nouveau ticket si nécessaire.</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:  { flex: 1, paddingTop: 16, backgroundColor: '#F8FAFC' },
  flex:  { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    shadowColor: '#0F1729', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  backBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerText: { fontSize: 15, fontWeight: '700', color: '#0F1729', flex: 1, marginHorizontal: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText:  { fontSize: 12, fontWeight: '700' },

  infoCard: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  infoSubject: { fontSize: 15, fontWeight: '700', color: '#0F1729', marginBottom: 8 },
  infoBadges:  { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  catBadge:    { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, backgroundColor: '#F1F5F9' },
  catText:     { fontSize: 12, color: '#64748B', fontWeight: '500' },
  priLabel:    { fontSize: 12, fontWeight: '700' },
  infoDate:    { fontSize: 11, color: '#94A3B8' },

  msgList: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 12 },

  bubble:      { maxWidth: '80%', borderRadius: 16, padding: 12 },
  bubbleStaff: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4,
    shadowColor: '#0F1729', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  bubbleUser:  { alignSelf: 'flex-end', backgroundColor: '#1056E0', borderBottomRightRadius: 4 },
  staffLabel:  { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 4 },
  bubbleText:  { fontSize: 14, lineHeight: 20 },
  textStaff:   { color: '#0F1729' },
  textUser:    { color: '#fff' },
  bubbleTime:  { fontSize: 10, marginTop: 4 },
  timeStaff:   { color: '#94A3B8' },
  timeUser:    { color: 'rgba(255,255,255,0.6)' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 100, borderRadius: 16,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    fontSize: 14, color: '#0F1729',
  },
  sendBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1056E0', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#CBD5E1' },

  closedBanner: {
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#F1F5F9', alignItems: 'center',
  },
  closedText: { fontSize: 13, color: '#64748B', textAlign: 'center' },

  errorText: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 16 },
  retryBtn:  { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#EFF5FF' },
  retryText: { fontSize: 14, fontWeight: '600', color: '#1056E0' },
});
