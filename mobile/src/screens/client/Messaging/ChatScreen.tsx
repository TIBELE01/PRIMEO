import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator,
  Alert, Image, ScrollView, Modal,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { ClientScreenProps } from '../../../navigation/types';
import { messagesApi } from '../../../services/api/endpoints/messages';
import { socketService } from '../../../services/socket/socketService';
import { useChatStore, type Message } from '../../../store/chatStore';
import { useAuth } from '../../../hooks/useAuth';

type Props = ClientScreenProps<'Chat'>;

export function ChatScreen({ navigation, route }: Props) {
  // Le chat est fréquemment ouvert depuis une notification push : les params
  // peuvent manquer — ne jamais déstructurer route.params sans repli.
  const { bookingId, recipientName } = route.params ?? ({} as Partial<Props['route']['params']>);
  const { user } = useAuth();

  const messages = useChatStore(s => s.messages[bookingId] ?? []);
  const setMessages = useChatStore(s => s.setMessages);
  const addMessage = useChatStore(s => s.addMessage);
  const markReadLocal = useChatStore(s => s.markRead);

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);

  // Réponses rapides (templates) : génériques pour les clients, CRUD pour les pros.
  type QuickTemplate = { id: string; label: string; content: string; editable: boolean };
  const [templates, setTemplates] = useState<QuickTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const canEditTemplates = templates.some(t => t.editable) ||
    (user?.role && user.role !== 'client' && user.role !== 'admin');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editing, setEditing] = useState<QuickTemplate | null>(null);
  const [draftLabel, setDraftLabel] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [savingTpl, setSavingTpl] = useState(false);
  const listRef = useRef<FlatList>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActive = useRef(false);

  // Load history
  useEffect(() => {
    if (!bookingId) { setLoading(false); return; }
    let cancelled = false; // pas de setState après démontage
    (async () => {
      try {
        const res = await messagesApi.getConversation(bookingId);
        const hist: Message[] = res?.data?.data ?? res?.data ?? [];
        if (cancelled) return;
        setMessages(bookingId, Array.isArray(hist) ? hist : []);
        messagesApi.markAsRead(bookingId).catch(() => null);
        socketService.markRead(bookingId);
        markReadLocal(bookingId);
      } catch {
        // keep empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bookingId]);

  // Charge les réponses rapides (une fois) — l'API renvoie les modèles
  // génériques (clients) ou les modèles du pro / suggestions par défaut.
  const loadTemplates = useCallback(async () => {
    try {
      const res = await messagesApi.listTemplates();
      const list: QuickTemplate[] = res?.data?.data ?? res?.data ?? [];
      setTemplates(Array.isArray(list) ? list : []);
    } catch {
      setTemplates([]);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const handlePickTemplate = (tpl: QuickTemplate) => {
    setText(prev => (prev.trim() ? `${prev.trim()} ${tpl.content}` : tpl.content));
    setShowTemplates(false);
  };

  const openEditor = (tpl: QuickTemplate | null) => {
    setEditing(tpl);
    setDraftLabel(tpl?.label ?? '');
    setDraftContent(tpl?.content ?? '');
    setEditorVisible(true);
  };

  const closeEditor = () => {
    setEditorVisible(false);
    setEditing(null);
    setDraftLabel('');
    setDraftContent('');
  };

  const handleSaveTemplate = async () => {
    const label = draftLabel.trim();
    const content = draftContent.trim();
    if (!label || !content || savingTpl) return;
    setSavingTpl(true);
    try {
      if (editing && editing.editable) {
        await messagesApi.updateTemplate(editing.id, { label, content });
      } else {
        await messagesApi.createTemplate(label, content);
      }
      await loadTemplates();
      closeEditor();
    } catch {
      Alert.alert('Erreur', 'Impossible d\'enregistrer ce modèle pour le moment.');
    } finally {
      setSavingTpl(false);
    }
  };

  const handleDeleteTemplate = (tpl: QuickTemplate) => {
    if (!tpl.editable) return;
    Alert.alert('Supprimer ce modèle ?', tpl.label, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try {
            await messagesApi.deleteTemplate(tpl.id);
            await loadTemplates();
          } catch {
            Alert.alert('Erreur', 'Suppression impossible pour le moment.');
          }
        },
      },
    ]);
  };

  // Socket subscription
  // ⚠️ Le nettoyage doit être retourné par l'EFFET lui-même, pas par le
  // callback .then() (React l'ignorerait) : sans cela, les écouteurs
  // s'accumulaient à chaque ouverture du chat → messages dupliqués et
  // setState sur composant démonté.
  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    let cleanupListeners: (() => void) | null = null;

    socketService.connect().then(() => {
      if (cancelled) return;
      socketService.joinRoom(bookingId);
      const socket = socketService.getSocket();
      if (!socket) return;

      const handleMessage = (msg: Message) => {
        if (cancelled || !msg) return;
        addMessage(bookingId, msg);
        socketService.markRead(bookingId);
        markReadLocal(bookingId);
      };
      const handleTyping = ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
        if (!cancelled && userId !== user?.id) setPeerTyping(isTyping);
      };
      const handleRead = () => { if (!cancelled) markReadLocal(bookingId); };

      socket.on('receive_message', handleMessage);
      socket.on('typing', handleTyping);
      socket.on('messages_read', handleRead);

      cleanupListeners = () => {
        socket.off('receive_message', handleMessage);
        socket.off('typing', handleTyping);
        socket.off('messages_read', handleRead);
      };
    });

    return () => {
      cancelled = true;
      cleanupListeners?.();
    };
  }, [bookingId, user?.id]);

  const scrollToBottom = useCallback(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  useEffect(() => {
    const t = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(t);
  }, [messages.length]);

  const handleTextChange = (val: string) => {
    setText(val);
    if (!typingActive.current) {
      typingActive.current = true;
      socketService.sendTyping(bookingId, true);
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      typingActive.current = false;
      socketService.sendTyping(bookingId, false);
    }, 2000);
  };

  const handleSend = () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    socketService.sendMessage(bookingId, content);
    setText('');
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingActive.current = false;
    socketService.sendTyping(bookingId, false);
    setSending(false);
  };

  const handleImagePick = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'image/*',
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      socketService.sendMessage(bookingId, `[Image] ${uri}`);
    }
  };

  const handleReport = (messageId: string) => {
    Alert.alert(
      'Signaler ce message',
      'Motif du signalement',
      [
        { text: 'Contenu inapproprié', onPress: () => doReport(messageId, 'inappropriate_content') },
        { text: 'Harcèlement', onPress: () => doReport(messageId, 'harassment') },
        { text: 'Spam', onPress: () => doReport(messageId, 'spam') },
        { text: 'Annuler', style: 'cancel' },
      ],
    );
  };

  const doReport = async (messageId: string, reason: string) => {
    try {
      await messagesApi.reportMessage(messageId, reason);
      Alert.alert('Signalé', 'Merci, nous avons bien reçu votre signalement.');
    } catch {
      Alert.alert('Erreur', 'Impossible d\'envoyer le signalement pour le moment.');
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.senderId === user?.id;
    // content peut être null (message supprimé / modéré côté serveur)
    const content = item.content ?? '';
    const isImageMsg = content.startsWith('[Image] ');
    const imgUri = isImageMsg ? content.replace('[Image] ', '') : null;

    return (
      <TouchableOpacity
        style={[styles.bubbleWrap, isMine ? styles.mine : styles.theirs]}
        onLongPress={() => !isMine && handleReport(item.id)}
        activeOpacity={0.85}
      >
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          {imgUri
            ? <Image source={{ uri: imgUri }} style={styles.msgImage} resizeMode="cover" />
            : <Text style={[styles.msgText, isMine && styles.msgTextMine]}>{content}</Text>
          }
          <View style={styles.meta}>
            <Text style={[styles.time, isMine && styles.timeMine]}>{formatTime(item.createdAt)}</Text>
            {isMine && (
              <Text style={styles.readTick}>{item.isRead ? '✓✓' : '✓'}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Conversation inaccessible sans identifiant de réservation (notification
  // malformée, deep link incomplet) : écran récupérable plutôt qu'un crash.
  if (!bookingId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={{ fontSize: 40 }}>💬</Text>
          <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32 }}>
            Conversation introuvable. Ouvrez la discussion depuis votre réservation.
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
            <Text style={{ color: '#1056E0', fontWeight: '700' }}>← Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{recipientName ?? 'Discussion'}</Text>
          {peerTyping && <Text style={styles.typingLabel}>est en train d'écrire...</Text>}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {loading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color="#1056E0" /></View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.list}
            onContentSizeChange={scrollToBottom}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>Démarrez la conversation avec {recipientName}</Text>
              </View>
            }
          />
        )}

        {/* Typing indicator */}
        {peerTyping && (
          <View style={styles.typingWrap}>
            <View style={styles.typingBubble}>
              <Text style={styles.typingDots}>• • •</Text>
            </View>
          </View>
        )}

        {/* Réponses rapides (chips) */}
        {showTemplates && (
          <View style={styles.tplBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tplRow}>
              {templates.map(tpl => (
                <TouchableOpacity
                  key={tpl.id}
                  style={styles.tplChip}
                  onPress={() => handlePickTemplate(tpl)}
                  onLongPress={() => handleDeleteTemplate(tpl)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tplChipText} numberOfLines={1}>{tpl.label}</Text>
                </TouchableOpacity>
              ))}
              {canEditTemplates && (
                <TouchableOpacity style={styles.tplAddChip} onPress={() => openEditor(null)} activeOpacity={0.7}>
                  <Text style={styles.tplAddChipText}>＋ Ajouter</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleImagePick}>
            <Text style={styles.iconBtnText}>📎</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setShowTemplates(v => !v)}
            disabled={templates.length === 0 && !canEditTemplates}
          >
            <Text style={[styles.iconBtnText, showTemplates && styles.iconBtnActive]}>⚡</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={handleTextChange}
            placeholder="Votre message..."
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
      </KeyboardAvoidingView>

      {/* Éditeur de modèle (pro) — création / modification */}
      <Modal visible={editorVisible} transparent animationType="slide" onRequestClose={closeEditor}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Modifier le modèle' : 'Nouveau modèle'}</Text>
            <Text style={styles.modalLabel}>Libellé (bouton)</Text>
            <TextInput
              style={styles.modalInput}
              value={draftLabel}
              onChangeText={setDraftLabel}
              placeholder="Ex : Heure d'arrivée"
              placeholderTextColor="#9CA3AF"
              maxLength={60}
            />
            <Text style={styles.modalLabel}>Message</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              value={draftContent}
              onChangeText={setDraftContent}
              placeholder="Texte qui sera inséré dans le message..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={1000}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={closeEditor}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, (!draftLabel.trim() || !draftContent.trim()) && styles.modalSaveDisabled]}
                onPress={handleSaveTemplate}
                disabled={!draftLabel.trim() || !draftContent.trim() || savingTpl}
              >
                <Text style={styles.modalSaveText}>{savingTpl ? '...' : 'Enregistrer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#fff',
  },
  backBtn: { padding: 8, marginRight: 4 },
  backArrow: { fontSize: 22, color: '#1056E0', fontWeight: '600' },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  typingLabel: { fontSize: 12, color: '#6B7280', fontStyle: 'italic' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 12, gap: 6 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  bubbleWrap: { flexDirection: 'row', marginVertical: 2 },
  mine: { justifyContent: 'flex-end' },
  theirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  bubbleMine: { backgroundColor: '#1056E0', borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: '#F3F4F6', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 15, color: '#111827', lineHeight: 21 },
  msgTextMine: { color: '#fff' },
  msgImage: { width: 200, height: 150, borderRadius: 10 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, justifyContent: 'flex-end' },
  time: { fontSize: 11, color: '#9CA3AF' },
  timeMine: { color: 'rgba(255,255,255,0.7)' },
  readTick: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  typingWrap: { paddingHorizontal: 16, paddingBottom: 4 },
  typingBubble: { backgroundColor: '#F3F4F6', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start' },
  typingDots: { fontSize: 18, color: '#9CA3AF', letterSpacing: 3 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', padding: 10, gap: 8,
    borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#fff',
  },
  iconBtn: { padding: 8 },
  iconBtnText: { fontSize: 20 },
  iconBtnActive: { opacity: 1, transform: [{ scale: 1.15 }] },
  tplBar: { borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#fff', paddingVertical: 8 },
  tplRow: { paddingHorizontal: 10, gap: 8, alignItems: 'center' },
  tplChip: {
    backgroundColor: '#EFF4FE', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8,
    maxWidth: 220, borderWidth: 1, borderColor: '#DCE7FB',
  },
  tplChipText: { color: '#1056E0', fontSize: 13, fontWeight: '600' },
  tplAddChip: {
    backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#1056E0', borderStyle: 'dashed',
  },
  tplAddChipText: { color: '#1056E0', fontSize: 13, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 6, marginTop: 8 },
  modalInput: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: '#111827', backgroundColor: '#FAFAFA',
  },
  modalTextarea: { minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 20 },
  modalCancel: { paddingHorizontal: 18, paddingVertical: 12 },
  modalCancelText: { color: '#6B7280', fontSize: 15, fontWeight: '600' },
  modalSave: { backgroundColor: '#1056E0', borderRadius: 12, paddingHorizontal: 22, paddingVertical: 12 },
  modalSaveDisabled: { backgroundColor: '#9CB8EE' },
  modalSaveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  input: {
    flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#111827',
    maxHeight: 100, backgroundColor: '#FAFAFA',
  },
  sendBtn: { backgroundColor: '#1056E0', width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#D1FAE5' },
  sendIcon: { color: '#fff', fontSize: 16 },
});
