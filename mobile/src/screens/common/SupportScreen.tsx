import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supportApi } from '../../services/api/endpoints/support';
import type { TicketCategory } from '../../types/support';
import { HEADER_BG, HEADER_FG, HEADER_BUTTON_BG, HEADER_SUBTLE } from '../../theme/header';

type ChatMsg = { id: string; from: 'bot' | 'user'; text: string };
type QReply  = { id: string; label: string };

// ── FAQ knowledge base ────────────────────────────────────────────────────────

const INIT_REPLIES: QReply[] = [
  { id: 'resa',    label: '📅 Reservations' },
  { id: 'pay',     label: '💳 Paiements' },
  { id: 'cancel',  label: '❌ Annulations' },
  { id: 'account', label: '👤 Mon compte' },
  { id: 'other',   label: '🆘 Autre chose' },
];

const FAQ: Record<string, { answer: string; replies: QReply[] }> = {
  resa: {
    answer: `Je peux vous aider avec les reservations. Que voulez-vous savoir ?`,
    replies: [
      { id: 'resa_how',    label: 'Comment reserver ?' },
      { id: 'resa_view',   label: 'Voir mes reservations' },
      { id: 'resa_modify', label: 'Modifier une reservation' },
      { id: 'other',       label: '🆘 Autre chose' },
    ],
  },
  resa_how: {
    answer: `Pour réserver :\n1. Trouvez un bien via la Recherche\n2. Sélectionnez vos dates et le nombre de personnes\n3. Choisissez l'option de paiement proposée par l'hôte : 100 % en ligne, acompte de 10 % (solde en espèces à l'arrivée) ou 100 % sur place\n4. Confirmez et, si besoin, payez via Genius Pay (vous avez 2 heures)\n\nRestaurant : réservation de table gratuite et immédiate. Immobilier : touchez « Exprimer mon intérêt ».`,
    replies: [
      { id: 'pay',    label: '💳 En savoir plus sur les paiements' },
      { id: 'resa',   label: '📅 Autre question sur les reservations' },
      { id: 'ticket', label: '🎫 Contacter le support' },
    ],
  },
  resa_view: {
    answer: `Toutes vos réservations sont dans l'onglet Réservations. Vous y trouvez :\n• Le statut (En attente de paiement, Confirmée, Terminée, Annulée)\n• Les détails du séjour et l'adresse exacte une fois confirmée\n• Les montants payés et le solde à régler sur place\n• Le bouton « Annuler la réservation »`,
    replies: [
      { id: 'cancel', label: '❌ Annuler une reservation' },
      { id: 'ticket', label: '🎫 Contacter le support' },
    ],
  },
  resa_modify: {
    answer: `La modification des dates n'est pas disponible dans l'application. Pour changer de dates :\n1. Annulez la réservation actuelle (selon le barème d'annulation)\n2. Effectuez une nouvelle réservation\n\nNotre support peut vous aider dans les cas particuliers.`,
    replies: [
      { id: 'cancel', label: '❌ Annulation' },
      { id: 'ticket', label: '🎫 Contacter le support' },
    ],
  },
  pay: {
    answer: `Pour les paiements, que souhaitez-vous savoir ?`,
    replies: [
      { id: 'pay_methods', label: 'Moyens de paiement' },
      { id: 'pay_options', label: 'Options de paiement' },
      { id: 'pay_refund',  label: 'Remboursement' },
      { id: 'other',       label: '🆘 Autre chose' },
    ],
  },
  pay_methods: {
    answer: `Le paiement en ligne s'effectue sur la page sécurisée Genius Pay : Mobile Money (par exemple Wave ou Orange Money) selon les moyens affichés. Un numéro de téléphone doit figurer dans votre profil. Aucun frais de service n'est ajouté par Primeo.`,
    replies: [
      { id: 'pay_options', label: 'Options de paiement' },
      { id: 'ticket',      label: '🎫 Contacter le support' },
    ],
  },
  pay_options: {
    answer: `Primeo propose trois options (selon ce que l'hôte active) :\n\n1. Paiement 100 % en ligne : vous payez tout à la réservation.\n\n2. Acompte de 10 % en ligne : le solde est réglé en espèces à l'arrivée.\n\n3. Paiement 100 % sur place : rien en ligne, la réservation est confirmée immédiatement.`,
    replies: [
      { id: 'pay_methods', label: 'Moyens de paiement' },
      { id: 'ticket',      label: '🎫 Contacter le support' },
    ],
  },
  pay_refund: {
    answer: `En cas d'annulation :\n• 7 jours ou plus avant l'arrivée : 100 % du montant payé en ligne\n• De 3 à 6 jours : 50 %\n• Moins de 3 jours : 0 %\n\nLe remboursement est crédité sur votre portefeuille Primeo et déduit de vos prochaines réservations. Si l'hôte annule, vous êtes remboursé intégralement. Pour un problème de remboursement, ouvrez un litige depuis la réservation.`,
    replies: [
      { id: 'cancel', label: '❌ Annulation' },
      { id: 'ticket', label: '🎫 Contacter le support' },
    ],
  },
  cancel: {
    answer: `Pour les annulations, quelle est votre question ?`,
    replies: [
      { id: 'cancel_how',     label: 'Comment annuler ?' },
      { id: 'cancel_refund',  label: 'Conditions de remboursement' },
      { id: 'cancel_dispute', label: 'Ouvrir un litige' },
      { id: 'other',          label: '🆘 Autre chose' },
    ],
  },
  cancel_how: {
    answer: `Pour annuler une réservation :\n1. Allez dans Réservations\n2. Sélectionnez la réservation\n3. Touchez « Annuler la réservation »\n4. Indiquez un motif et confirmez\n\nLa fenêtre d'annulation affiche à l'avance le remboursement auquel vous avez droit.`,
    replies: [
      { id: 'cancel_refund', label: 'Conditions de remboursement' },
      { id: 'ticket',        label: '🎫 Contacter le support' },
    ],
  },
  cancel_refund: {
    answer: `Le remboursement dépend du nombre de jours avant l'arrivée :\n\n• 7 jours ou plus : 100 % du montant payé en ligne\n• De 3 à 6 jours : 50 %\n• Moins de 3 jours : aucun remboursement\n\nIl est crédité sur votre portefeuille Primeo. Une réservation non payée ne vous coûte rien. Si c'est l'hôte qui annule, vous êtes remboursé intégralement.`,
    replies: [
      { id: 'cancel_dispute', label: 'Ouvrir un litige' },
      { id: 'ticket',         label: '🎫 Contacter le support' },
    ],
  },
  cancel_dispute: {
    answer: `Vous pouvez ouvrir un litige si :\n• Un remboursement attendu n'a pas été reçu\n• Le logement ne correspond pas à l'annonce\n• L'hôte n'a pas respecté ses engagements\n\nPour cela : ouvrez la réservation concernée puis touchez « Signaler un problème » (description d'au moins 20 caractères). Un administrateur décide d'un rejet, d'un remboursement partiel ou total.`,
    replies: [{ id: 'ticket', label: '🎫 Contacter le support' }],
  },
  account: {
    answer: `Pour votre compte, quelle est votre question ?`,
    replies: [
      { id: 'account_profile',  label: 'Modifier mon profil' },
      { id: 'account_password', label: 'Changer le mot de passe' },
      { id: 'account_2fa',      label: 'Authentification 2FA' },
      { id: 'other',            label: '🆘 Autre chose' },
    ],
  },
  account_profile: {
    answer: `Pour modifier votre profil :\n1. Allez dans l'onglet Profil\n2. Touchez « Modifier mes informations »\n3. Mettez à jour vos informations\n4. Sauvegardez`,
    replies: [
      { id: 'account_password', label: 'Changer le mot de passe' },
      { id: 'ticket',           label: '🎫 Contacter le support' },
    ],
  },
  account_password: {
    answer: `Pour changer votre mot de passe :\n1. Allez dans Profil > « Changer le mot de passe »\n2. Entrez votre mot de passe actuel\n3. Choisissez un nouveau mot de passe (8 caractères, 1 majuscule, 1 chiffre)\n4. Confirmez et sauvegardez\n\nSi vous l'avez oublié, touchez « Mot de passe oublié » sur l'écran de connexion : le lien reçu par e-mail est valable 1 heure.`,
    replies: [
      { id: 'account_2fa', label: 'Authentification 2FA' },
      { id: 'ticket',      label: '🎫 Contacter le support' },
    ],
  },
  account_2fa: {
    answer: `La double authentification (2FA) renforce la securite :\n1. Allez dans Profil > "Authentification 2FA"\n2. Activez et scannez le QR code avec Google Authenticator ou Authy\n3. Entrez le code de confirmation\n\nUne fois activee, un code temporaire sera demande a chaque connexion.`,
    replies: [{ id: 'ticket', label: '🎫 Contacter le support' }],
  },
  other: {
    answer: `Je n'ai pas trouve de reponse dans ma base de connaissances. Notre equipe de support est la pour vous aider !`,
    replies: [
      { id: 'ticket',      label: '🎫 Creer un ticket de support' },
      { id: 'tickets_nav', label: '📋 Voir mes tickets' },
    ],
  },
  ticket: {
    answer: `Notre equipe de support va prendre en charge votre demande. Remplissez le formulaire ci-dessous et nous vous repondrons dans les plus brefs delais.`,
    replies: [],
  },
};

function matchFaq(text: string): string | null {
  const t = text.toLowerCase();
  if (/r[eé]serv|booking|s[eé]jour|h[eé]bergement/.test(t)) return 'resa';
  if (/paie?ment|payer|orange money|mtn|genius|carte/.test(t)) return 'pay';
  if (/annul|cancel|rembours/.test(t)) return 'cancel';
  if (/compte|profil|mot de passe|password|2fa|authentification/.test(t)) return 'account';
  return null;
}

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'technique',    label: '🔧 Probleme technique' },
  { value: 'litige',       label: '⚖️ Litige' },
  { value: 'information',  label: 'ℹ️ Information' },
  { value: 'reclamation',  label: '📢 Reclamation' },
];

let _uid = 0;
const uid = () => String(++_uid);

export default function SupportScreen() {
  const navigation = useNavigation<any>();
  const flatRef    = useRef<FlatList>(null);

  const [msgs, setMsgs]         = useState<ChatMsg[]>([
    { id: uid(), from: 'bot', text: 'Bonjour 👋 Je suis l\'assistant Primeo. Comment puis-je vous aider ?' },
  ]);
  const [replies, setReplies]   = useState<QReply[]>(INIT_REPLIES);
  const [inputText, setInput]   = useState('');
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<TicketCategory>('information');
  const [subject, setSubject]   = useState('');
  const [desc, setDesc]         = useState('');
  const [sending, setSending]   = useState(false);

  const push = useCallback((from: ChatMsg['from'], text: string, nextReplies?: QReply[]) => {
    setMsgs(prev => [...prev, { id: uid(), from, text }]);
    if (nextReplies !== undefined) setReplies(nextReplies);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const handleQuickReply = useCallback((reply: QReply) => {
    push('user', reply.label);
    setReplies([]);
    if (reply.id === 'tickets_nav') { navigation.navigate('SupportTickets'); return; }
    if (reply.id === 'ticket') {
      setTimeout(() => push('bot', FAQ.ticket.answer, []), 400);
      setTimeout(() => setShowForm(true), 800);
      return;
    }
    const faq = FAQ[reply.id];
    if (faq) {
      setTimeout(() => push('bot', faq.answer, faq.replies), 400);
    } else {
      setTimeout(() => push('bot', 'Je ne comprends pas. Essayez une des options ci-dessous.', INIT_REPLIES), 400);
    }
  }, [navigation, push]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    setInput('');
    push('user', text);
    setReplies([]);
    const key = matchFaq(text);
    const faq = key ? FAQ[key] : null;
    setTimeout(() => {
      if (faq) push('bot', faq.answer, faq.replies);
      else push('bot', FAQ.other.answer, FAQ.other.replies);
    }, 400);
  }, [inputText, push]);

  const handleCreateTicket = useCallback(async () => {
    if (!subject.trim()) { Alert.alert('Champ requis', 'Veuillez saisir un sujet.'); return; }
    if (!desc.trim())    { Alert.alert('Champ requis', 'Veuillez decrire votre probleme.'); return; }
    setSending(true);
    try {
      await supportApi.createTicket({ subject: subject.trim(), description: desc.trim(), category });
      setShowForm(false);
      push('bot', '✅ Votre ticket a ete cree avec succes. Notre equipe vous repondra sous 24h ouvrables.', [
        { id: 'tickets_nav', label: '📋 Voir mes tickets' },
      ]);
      setSubject(''); setDesc('');
    } catch {
      Alert.alert('Erreur', 'Impossible de creer le ticket. Verifiez votre connexion.');
    } finally {
      setSending(false);
    }
  }, [category, subject, desc, push]);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={HEADER_FG} />
        </TouchableOpacity>
        <View style={s.headerTitle}>
          <View style={s.botDot} />
          <Text style={s.headerText}>Assistant Primeo</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('SupportTickets')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="list" size={22} color={HEADER_FG} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={flatRef}
          data={msgs}
          keyExtractor={(m, i) => m.id ?? String(i)}
          contentContainerStyle={s.msgList}
          renderItem={({ item }) => (
            <View style={[s.bubble, item.from === 'user' ? s.bubbleUser : s.bubbleBot]}>
              <Text style={item.from === 'user' ? s.textUser : s.textBot}>{item.text}</Text>
            </View>
          )}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        />

        {replies.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow} style={s.chipsWrap}>
            {replies.map(r => (
              <TouchableOpacity key={r.id} style={s.chip} onPress={() => handleQuickReply(r)} activeOpacity={0.75}>
                <Text style={s.chipText}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            value={inputText}
            onChangeText={setInput}
            placeholder="Posez votre question..."
            placeholderTextColor="#94A3B8"
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity style={[s.sendBtn, !inputText.trim() && s.sendBtnDisabled]} onPress={handleSend} disabled={!inputText.trim()} activeOpacity={0.8}>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Nouveau ticket de support</Text>
              <TouchableOpacity onPress={() => setShowForm(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={s.fieldLabel}>Categorie</Text>
            <View style={s.catRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c.value} style={[s.catChip, category === c.value && s.catChipActive]} onPress={() => setCategory(c.value)} activeOpacity={0.8}>
                  <Text style={[s.catChipText, category === c.value && s.catChipTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>Sujet</Text>
            <TextInput style={s.fieldInput} value={subject} onChangeText={setSubject} placeholder="Ex : Probleme de paiement sur ma reservation" placeholderTextColor="#94A3B8" maxLength={120} />

            <Text style={s.fieldLabel}>Description</Text>
            <TextInput style={[s.fieldInput, s.fieldTextarea]} value={desc} onChangeText={setDesc} placeholder="Decrivez votre probleme en detail..." placeholderTextColor="#94A3B8" multiline numberOfLines={5} textAlignVertical="top" maxLength={2000} />

            <TouchableOpacity style={[s.submitBtn, sending && s.submitBtnDisabled]} onPress={handleCreateTicket} disabled={sending} activeOpacity={0.85}>
              {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.submitText}>Envoyer le ticket</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, paddingTop: 16, backgroundColor: '#F8FAFC' },
  flex:    { flex: 1 },
  header:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: HEADER_BG,
    borderBottomWidth: 1, borderBottomColor: HEADER_BG,
    shadowColor: '#0F1729', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  backBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: HEADER_BUTTON_BG, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  botDot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: '#5BBD15' },
  headerText:   { fontSize: 16, fontWeight: '700', color: HEADER_FG},
  msgList:      { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 10 },
  bubble:       { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleBot:    { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#0F1729', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  bubbleUser:   { alignSelf: 'flex-end', backgroundColor: '#1056E0', borderBottomRightRadius: 4 },
  textBot:      { fontSize: 14, color: '#0F1729', lineHeight: 20 },
  textUser:     { fontSize: 14, color: '#fff', lineHeight: 20 },
  chipsWrap:    { maxHeight: 52, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  chipsRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  chip:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#EFF5FF', borderWidth: 1, borderColor: '#C7D8FC' },
  chipText:     { fontSize: 13, fontWeight: '600', color: '#1056E0' },
  inputRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  input:        { flex: 1, height: 40, borderRadius: 20, paddingHorizontal: 16, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', fontSize: 14, color: '#0F1729' },
  sendBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1056E0', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#CBD5E1' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,41,0.5)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36, shadowColor: '#0F1729', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16 },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle:   { fontSize: 17, fontWeight: '700', color: '#0F1729' },
  fieldLabel:   { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 6, marginTop: 14 },
  fieldInput:   { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#0F1729', backgroundColor: '#F8FAFC' },
  fieldTextarea: { minHeight: 100, paddingTop: 10 },
  catRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip:      { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  catChipActive: { borderColor: '#1056E0', backgroundColor: '#EFF5FF' },
  catChipText:   { fontSize: 13, color: '#64748B', fontWeight: '500' },
  catChipTextActive: { color: '#1056E0', fontWeight: '700' },
  submitBtn:     { marginTop: 20, height: 48, borderRadius: 14, backgroundColor: '#1056E0', alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { backgroundColor: '#94A3B8' },
  submitText:    { fontSize: 15, fontWeight: '700', color: '#fff' },
});
