// Écran Statut KYC partagé — affiche l'état de vérification et permet la (re)soumission
// des documents justificatifs. Utilisé par les 4 verticales pro (résidence, hôtel,
// immobilier, restaurant).
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useTheme, type Theme } from '../../theme/ThemeProvider';
import { professionalApi, type KycStatus } from '../../services/api/endpoints/professional';
import { submitKyc, type KycDocumentFile } from '../../services/kycUpload';

type DocDef = { key: string; label: string; required: boolean };

const KYC_DOCS: DocDef[] = [
  { key: 'identity',        label: "Pièce d'identité",        required: true  },
  { key: 'rccm_extract',    label: 'Extrait RCCM',             required: true  },
  { key: 'tax_id_certificate', label: 'Attestation fiscale',   required: false },
  { key: 'tourist_license', label: "Autorisation d'exercice",  required: false },
];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  approved: { label: 'Vérifié',    color: '#15803D', bg: '#DCFCE7' },
  pending:  { label: 'En attente', color: '#B45309', bg: '#FEF3C7' },
  rejected: { label: 'Rejeté',     color: '#B91C1C', bg: '#FEE2E2' },
};

export function KycStatusScreenBase() {
  const { theme } = useTheme();
  const s = makeStyles(theme);

  const [status, setStatus] = useState<KycStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [docs, setDocs] = useState<KycDocumentFile[]>([]);

  const load = useCallback(async () => {
    try {
      const { data } = await professionalApi.getKycStatus();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const getDoc = (key: string) => docs.find((d) => d.key === key) ?? null;

  const pickDocument = async (key: string) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setDocs((prev) => [
        ...prev.filter((d) => d.key !== key),
        { key, uri: asset.uri, name: asset.name, file: (asset as { file?: File }).file },
      ]);
    }
  };

  const canSubmit = KYC_DOCS.filter((d) => d.required).every((d) => getDoc(d.key) !== null);

  const handleSubmit = async () => {
    if (!status) return;
    if (!canSubmit) {
      Alert.alert('Documents requis', 'Veuillez fournir au moins la pièce d\'identité et l\'extrait RCCM.');
      return;
    }
    setSubmitting(true);
    try {
      await submitKyc(
        {
          businessName: status.businessName,
          rccm: status.rccm ?? undefined,
          taxId: status.taxId ?? undefined,
          touristLicense: status.touristLicense ?? undefined,
        },
        docs,
      );
      Alert.alert('Dossier envoyé', 'Vos documents ont été soumis. Notre équipe les examinera sous peu.');
      setDocs([]);
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      Alert.alert('Erreur', e?.response?.data?.error ?? "L'envoi a échoué. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <ScreenWrapper><View style={s.center}><ActivityIndicator color={theme.colors.primary} /></View></ScreenWrapper>;
  }

  const meta = STATUS_META[status?.verificationStatus ?? 'pending'] ?? STATUS_META.pending;
  // Re-soumission autorisée tant que non approuvé
  const canResubmit = status?.verificationStatus !== 'approved';

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>Statut KYC</Text>

        <View style={[s.badge, { backgroundColor: meta.bg }]}>
          <Text style={[s.badgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>

        {status?.verificationStatus === 'rejected' && status.verificationNotes && (
          <View style={s.rejectBox}>
            <Text style={s.rejectTitle}>Motif du rejet</Text>
            <Text style={s.rejectText}>{status.verificationNotes}</Text>
          </View>
        )}

        {status?.verificationStatus === 'approved' && (
          <Text style={s.info}>Votre compte est vérifié. Vous pouvez publier vos annonces.</Text>
        )}

        {/* Documents déjà soumis */}
        {status && status.documents.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Documents soumis</Text>
            {status.documents.map((d) => (
              <View key={d.id} style={s.submittedRow}>
                <Text style={s.submittedType}>{d.type}</Text>
                <Text style={s.submittedDate}>{new Date(d.uploadedAt).toLocaleDateString('fr-CI')}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Formulaire de (re)soumission */}
        {canResubmit && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>
              {status && status.documents.length > 0 ? 'Renvoyer des documents' : 'Soumettre vos documents'}
            </Text>
            {KYC_DOCS.map((doc) => {
              const picked = getDoc(doc.key);
              return (
                <View key={doc.key} style={s.docCard}>
                  <View style={s.docInfo}>
                    <Text style={s.docLabel}>
                      {doc.label}<Text style={s.docBadge}>{doc.required ? ' *' : ' (optionnel)'}</Text>
                    </Text>
                    <Text style={picked ? s.docName : s.docEmpty} numberOfLines={1}>
                      {picked ? picked.name : 'Aucun fichier'}
                    </Text>
                  </View>
                  <TouchableOpacity style={[s.pickBtn, !!picked && s.pickBtnDone]} onPress={() => pickDocument(doc.key)}>
                    <Text style={s.pickBtnText}>{picked ? 'Changer' : 'Choisir'}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            <TouchableOpacity
              style={[s.submitBtn, (!canSubmit || submitting) && s.btnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit || submitting}
            >
              {submitting
                ? <ActivityIndicator color="#FFF" />
                : <Text style={s.submitBtnText}>Envoyer mon dossier</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll:       { padding: 20, gap: 16, paddingBottom: 40 },
    title:        { fontSize: 22, fontWeight: '800', color: t.colors.text },
    badge:        { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
    badgeText:    { fontSize: 13, fontWeight: '700' },
    info:         { fontSize: 14, color: t.colors.textSecondary, lineHeight: 20 },
    rejectBox:    { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 14, gap: 4 },
    rejectTitle:  { fontSize: 13, fontWeight: '700', color: '#B91C1C' },
    rejectText:   { fontSize: 14, color: '#7F1D1D', lineHeight: 20 },
    section:      { gap: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: t.colors.text, marginTop: 8 },
    submittedRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: t.colors.border },
    submittedType:{ fontSize: 13, color: t.colors.text, fontWeight: '600' },
    submittedDate:{ fontSize: 12, color: t.colors.textSecondary },
    docCard:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: t.colors.border, borderRadius: 12, padding: 12, gap: 12 },
    docInfo:      { flex: 1, gap: 3 },
    docLabel:     { fontSize: 14, fontWeight: '600', color: t.colors.text },
    docBadge:     { color: t.colors.textSecondary, fontWeight: '400' },
    docName:      { fontSize: 12, color: t.colors.success, fontWeight: '500' },
    docEmpty:     { fontSize: 12, color: t.colors.textDisabled },
    pickBtn:      { backgroundColor: t.colors.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, minWidth: 72, alignItems: 'center' },
    pickBtnDone:  { backgroundColor: t.colors.success },
    pickBtnText:  { color: '#FFF', fontSize: 13, fontWeight: '700' },
    submitBtn:    { backgroundColor: t.colors.primary, paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
    btnDisabled:  { opacity: 0.4 },
    submitBtnText:{ color: '#FFF', fontSize: 16, fontWeight: '700' },
  });
}

export default KycStatusScreenBase;
