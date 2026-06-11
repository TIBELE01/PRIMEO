import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator,
  Alert, Image,
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

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleImagePick}>
            <Text style={styles.iconBtnText}>📎</Text>
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
  input: {
    flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#111827',
    maxHeight: 100, backgroundColor: '#FAFAFA',
  },
  sendBtn: { backgroundColor: '#1056E0', width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#D1FAE5' },
  sendIcon: { color: '#fff', fontSize: 16 },
});
