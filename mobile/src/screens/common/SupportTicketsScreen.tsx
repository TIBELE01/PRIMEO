import React, { useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { useState } from 'react';
import { supportApi } from '../../services/api/endpoints/support';
import type { SupportTicket, TicketStatus, TicketCategory } from '../../types/support';

// ── Display helpers ───────────────────────────────────────────────────────────

const STATUS_CFG: Record<TicketStatus, { label: string; bg: string; text: string }> = {
  open:        { label: 'Ouvert',      bg: '#EFF5FF', text: '#1056E0' },
  in_progress: { label: 'En cours',   bg: '#FDF7EE', text: '#D67309' },
  resolved:    { label: 'Résolu',     bg: '#F3FCE8', text: '#469A0E' },
  closed:      { label: 'Fermé',      bg: '#F1F5F9', text: '#64748B' },
};

const CAT_CFG: Record<TicketCategory, { label: string; emoji: string }> = {
  technique:   { label: 'Technique',  emoji: '🔧' },
  litige:      { label: 'Litige',     emoji: '⚖️' },
  information: { label: 'Information', emoji: 'ℹ️' },
  reclamation: { label: 'Réclamation', emoji: '📢' },
};

const PRIORITY_CFG = {
  haute:   { label: 'Haute',   color: '#D41313' },
  normale: { label: 'Normale', color: '#D67309' },
  basse:   { label: 'Basse',   color: '#469A0E' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Ticket row ────────────────────────────────────────────────────────────────

function TicketRow({ ticket, onPress }: { ticket: SupportTicket; onPress: () => void }) {
  const st  = STATUS_CFG[ticket.status]   ?? STATUS_CFG.open;
  const cat = CAT_CFG[ticket.category]   ?? { label: ticket.category, emoji: '📌' };
  const pri = PRIORITY_CFG[ticket.priority] ?? PRIORITY_CFG.normale;
  const isOpen = ticket.status === 'open' || ticket.status === 'in_progress';

  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.8}>
      <View style={[s.rowLeft, isOpen && s.rowLeftActive]} />
      <View style={s.rowBody}>
        <View style={s.rowTopLine}>
          <Text style={s.rowSubject} numberOfLines={1}>{ticket.subject}</Text>
          <Text style={s.rowDate}>{fmtDate(ticket.updatedAt)}</Text>
        </View>
        <View style={s.rowBadges}>
          <View style={[s.badge, { backgroundColor: st.bg }]}>
            <Text style={[s.badgeText, { color: st.text }]}>{st.label}</Text>
          </View>
          <View style={s.badge2}>
            <Text style={s.badge2Text}>{cat.emoji} {cat.label}</Text>
          </View>
          <View style={[s.priDot, { backgroundColor: pri.color }]} />
          <Text style={[s.priText, { color: pri.color }]}>{pri.label}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={s.rowArrow} />
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function SupportTicketsScreen() {
  const navigation = useNavigation<any>();
  const [tickets, setTickets]     = useState<SupportTicket[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(false);
    try {
      const data = await supportApi.getMyTickets();
      setTickets((data as any)?.tickets ?? data ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(true); };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color="#0F1729" />
        </TouchableOpacity>
        <Text style={s.headerText}>Mes tickets de support</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('SupportChatbot')}
          style={s.newBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#1056E0" />
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text style={s.errorText}>Impossible de charger vos tickets.</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => load()}>
            <Text style={s.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={t => t.id}
          contentContainerStyle={tickets.length === 0 ? s.emptyWrap : s.listPad}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1056E0" />}
          renderItem={({ item }) => (
            <TicketRow
              ticket={item}
              onPress={() => navigation.navigate('SupportTicketDetail', { ticketId: item.id })}
            />
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🎫</Text>
              <Text style={s.emptyTitle}>Aucun ticket</Text>
              <Text style={s.emptyDesc}>Vous n'avez pas encore de ticket de support. Notre assistant peut répondre à la plupart des questions.</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('SupportChatbot')} activeOpacity={0.85}>
                <Text style={s.emptyBtnText}>Ouvrir l'assistant</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    shadowColor: '#0F1729', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  backBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerText: { fontSize: 16, fontWeight: '700', color: '#0F1729', flex: 1, textAlign: 'center' },
  newBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1056E0', alignItems: 'center', justifyContent: 'center' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  listPad: { padding: 12, gap: 10 },
  emptyWrap: { flex: 1 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0F1729', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  rowLeft:       { width: 4, alignSelf: 'stretch', backgroundColor: '#E2E8F0' },
  rowLeftActive: { backgroundColor: '#1056E0' },
  rowBody:       { flex: 1, paddingHorizontal: 14, paddingVertical: 12 },
  rowTopLine:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  rowSubject:    { fontSize: 14, fontWeight: '600', color: '#0F1729', flex: 1 },
  rowDate:       { fontSize: 11, color: '#94A3B8' },
  rowBadges:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowArrow:      { marginRight: 12 },

  badge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badge2:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: '#F1F5F9' },
  badge2Text: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  priDot:    { width: 6, height: 6, borderRadius: 3 },
  priText:   { fontSize: 11, fontWeight: '600' },

  errorText: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 16 },
  retryBtn:  { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#EFF5FF' },
  retryText: { fontSize: 14, fontWeight: '600', color: '#1056E0' },

  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon:    { fontSize: 48, marginBottom: 16 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: '#0F1729', marginBottom: 8 },
  emptyDesc:    { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn:     { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, backgroundColor: '#1056E0' },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
