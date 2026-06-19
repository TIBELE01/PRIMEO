import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import type { ClientScreenProps } from '../../../navigation/types';
import { disputesApi } from '../../../services/api/endpoints/disputes';

type Props = ClientScreenProps<'NewDispute'>;

const CATEGORIES: { key: string; label: string; icon: string; description: string }[] = [
  {
    key: 'non_conformity',
    label: 'Non-conformité',
    icon: '🏠',
    description: 'Le logement ne correspond pas à l\'annonce',
  },
  {
    key: 'payment_issue',
    label: 'Problème de paiement',
    icon: '💳',
    description: 'Débitage incorrect, montant erroné',
  },
  {
    key: 'cancellation',
    label: 'Annulation abusive',
    icon: '❌',
    description: 'L\'hôte a annulé sans motif valable',
  },
  {
    key: 'no_show',
    label: 'Accès impossible',
    icon: '🚪',
    description: 'Hôte absent, clés non remises',
  },
  {
    key: 'other',
    label: 'Autre problème',
    icon: '⚠️',
    description: 'Tout autre motif de litige',
  },
];

export function NewDisputeScreen({ navigation, route }: Props) {
  const { bookingId } = route.params ?? ({} as Partial<Props['route']['params']>);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleAttach = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      multiple: true,
      copyToCacheDirectory: false,
    });
    if (!result.canceled) {
      const names = result.assets.map(a => a.name ?? a.uri.split('/').pop() ?? 'fichier');
      setAttachments(prev => [...prev, ...names].slice(0, 5));
    }
  };

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert('Catégorie requise', 'Veuillez sélectionner une catégorie.');
      return;
    }
    if (description.trim().length < 20) {
      Alert.alert('Description trop courte', 'Veuillez décrire le problème en au moins 20 caractères.');
      return;
    }

    setSubmitting(true);
    try {
      const dispute = await disputesApi.create({
        bookingId,
        reason: selectedCategory,
        description: description.trim(),
      });
      Alert.alert(
        'Litige ouvert ✓',
        'Votre litige a été enregistré. Notre équipe va l\'examiner et vous contactera. Vous recevrez une notification à chaque changement de statut.',
        [
          {
            text: 'Suivre mon litige',
            onPress: () => navigation.replace('DisputeDetail', { disputeId: (dispute as any).data?.id ?? (dispute as any).id }),
          },
        ],
      );
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        Alert.alert(
          'Litige existant',
          'Un litige est déjà ouvert pour cette réservation. Consultez la liste de vos litiges.',
          [
            { text: 'Voir mes litiges', onPress: () => navigation.navigate('DisputeList') },
            { text: 'OK', style: 'cancel' },
          ],
        );
      } else {
        Alert.alert('Erreur', err?.response?.data?.message ?? 'Une erreur est survenue.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !!selectedCategory && description.trim().length >= 20 && !submitting;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Signaler un problème</Text>
          <Text style={styles.subtitle}>Notre équipe traitera votre litige dans les meilleurs délais</Text>
        </View>

        {/* Category picker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Catégorie du problème *</Text>
          <View style={styles.categories}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.catCard, selectedCategory === cat.key && styles.catCardActive]}
                onPress={() => setSelectedCategory(cat.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.catIcon}>{cat.icon}</Text>
                <Text style={[styles.catLabel, selectedCategory === cat.key && styles.catLabelActive]}>
                  {cat.label}
                </Text>
                <Text style={styles.catDesc} numberOfLines={2}>{cat.description}</Text>
                {selectedCategory === cat.key && (
                  <View style={styles.catCheck}><Text style={styles.catCheckText}>✓</Text></View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description détaillée * <Text style={styles.minChars}>(min. 20 caractères)</Text></Text>
          <TextInput
            style={styles.descInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Décrivez précisément le problème rencontré : date, circonstances, impacts..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={6}
            maxLength={1000}
            textAlignVertical="top"
          />
          <View style={styles.descFooter}>
            <Text style={[styles.descLen, description.trim().length < 20 && description.length > 0 && styles.descLenWarn]}>
              {description.length}/1000
            </Text>
            {description.trim().length > 0 && description.trim().length < 20 && (
              <Text style={styles.descLenWarn}>{20 - description.trim().length} caractères manquants</Text>
            )}
          </View>
        </View>

        {/* Attachments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pièces jointes ({attachments.length}/5)</Text>
          <Text style={styles.attachHint}>Photos, captures d'écran, documents PDF</Text>
          <TouchableOpacity
            style={[styles.attachBtn, attachments.length >= 5 && styles.attachBtnDisabled]}
            onPress={handleAttach}
            disabled={attachments.length >= 5}
          >
            <Text style={styles.attachBtnIcon}>📎</Text>
            <Text style={styles.attachBtnText}>Joindre des fichiers</Text>
          </TouchableOpacity>
          {attachments.length > 0 && (
            <View style={styles.fileList}>
              {attachments.map((name, i) => (
                <View key={i} style={styles.fileChip}>
                  <Text style={styles.fileIcon}>{name.endsWith('.pdf') ? '📄' : '🖼'}</Text>
                  <Text style={styles.fileName} numberOfLines={1}>{name}</Text>
                  <TouchableOpacity onPress={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}>
                    <Text style={styles.fileRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Notice */}
        <View style={styles.notice}>
          <Text style={styles.noticeIcon}>ℹ️</Text>
          <View style={styles.noticeBody}>
            <Text style={styles.noticeTitle}>Traitement du litige</Text>
            <Text style={styles.noticeText}>
              Un administrateur examinera votre dossier, pourra vous contacter et prendra une décision (rejet, remboursement partiel ou total). Vous serez notifié par push et email à chaque changement.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitText}>Soumettre le litige</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingTop: 16, backgroundColor: '#F9FAFB' },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  minChars: { fontSize: 12, fontWeight: '400', color: '#9CA3AF' },
  categories: { gap: 8, marginTop: 8 },
  catCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB',
    backgroundColor: '#fff', position: 'relative',
  },
  catCardActive: { borderColor: '#1056E0', backgroundColor: '#F0FDF4' },
  catIcon: { fontSize: 22, width: 28, textAlign: 'center' },
  catLabel: { fontSize: 14, fontWeight: '700', color: '#374151', flex: 1 },
  catLabelActive: { color: '#1056E0' },
  catDesc: { fontSize: 12, color: '#9CA3AF', flex: 1, marginTop: 2, lineHeight: 16 },
  catCheck: { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10, backgroundColor: '#1056E0', alignItems: 'center', justifyContent: 'center' },
  catCheckText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  descInput: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#111827', minHeight: 120,
  },
  descFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  descLen: { fontSize: 11, color: '#9CA3AF' },
  descLenWarn: { fontSize: 11, color: '#DC2626' },
  attachHint: { fontSize: 12, color: '#9CA3AF', marginBottom: 8, marginTop: -4 },
  attachBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#D1D5DB', borderStyle: 'dashed', borderRadius: 10, padding: 14,
  },
  attachBtnDisabled: { opacity: 0.4 },
  attachBtnIcon: { fontSize: 20 },
  attachBtnText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  fileList: { gap: 6, marginTop: 10 },
  fileChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  fileIcon: { fontSize: 14 },
  fileName: { flex: 1, fontSize: 12, color: '#374151' },
  fileRemove: { fontSize: 12, color: '#9CA3AF', fontWeight: '700' },
  notice: { flexDirection: 'row', gap: 10, backgroundColor: '#FFF7ED', borderRadius: 12, padding: 14, marginBottom: 20, alignItems: 'flex-start', borderWidth: 1, borderColor: '#FED7AA' },
  noticeIcon: { fontSize: 18 },
  noticeBody: { flex: 1 },
  noticeTitle: { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 4 },
  noticeText: { fontSize: 12, color: '#92400E', lineHeight: 17 },
  submitBtn: { backgroundColor: '#DC2626', borderRadius: 12, padding: 16, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: '#FCA5A5' },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
