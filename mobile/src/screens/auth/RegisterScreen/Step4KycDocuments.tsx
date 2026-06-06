import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme, type Theme } from '../../../theme/ThemeProvider';
import type { RegistrationData } from './index';

type Props = {
  data: RegistrationData;
  onUpdate: (patch: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
};

type DocDef = { key: string; label: string; required: boolean };

const KYC_DOCS: DocDef[] = [
  { key: 'identity',       label: "Pièce d'identité",   required: true  },
  { key: 'rccm_extract',   label: 'Extrait RCCM',        required: true  },
  { key: 'tourist_license',label: 'Licence touristique', required: false },
];

export function Step4KycDocuments({ data, onUpdate, onNext, onBack, currentStep, totalSteps }: Props) {
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const [picking, setPicking] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  const getDoc = (key: string) => data.kycDocuments.find((d) => d.key === key) ?? null;

  const pickDocument = async (key: string) => {
    setPicking(key);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const updated = data.kycDocuments.filter((d) => d.key !== key);
        updated.push({ key, uri: asset.uri, name: asset.name });
        onUpdate({ kycDocuments: updated });
      }
    } finally {
      setPicking(null);
    }
  };

  const requiredUploaded = KYC_DOCS.filter((d) => d.required).every((d) => getDoc(d.key) !== null);

  const handleNext = () => {
    setAttempted(true);
    if (requiredUploaded) onNext();
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${(currentStep / totalSteps) * 100}%` }]} />
      </View>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.stepLabel}>Étape {currentStep}/{totalSteps}</Text>
          <Text style={s.title}>Justificatifs KYC</Text>
          <Text style={s.subtitle}>
            Fournissez des documents clairs et lisibles (PDF ou image).{'\n'}Les documents marqués * sont obligatoires.
          </Text>
        </View>

        <View style={s.docList}>
          {KYC_DOCS.map((doc) => {
            const uploaded = getDoc(doc.key);
            const isMissing = attempted && doc.required && !uploaded;
            return (
              <View key={doc.key} style={[s.docCard, isMissing && s.docCardError]}>
                <View style={s.docInfo}>
                  <Text style={s.docLabel}>
                    {doc.label}
                    <Text style={s.docBadge}>{doc.required ? ' *' : ' (optionnel)'}</Text>
                  </Text>
                  {uploaded
                    ? <Text style={s.docName} numberOfLines={1}>{uploaded.name}</Text>
                    : <Text style={s.docEmpty}>Aucun fichier sélectionné</Text>
                  }
                </View>
                <TouchableOpacity
                  style={[s.pickBtn, !!uploaded && s.pickBtnDone]}
                  onPress={() => pickDocument(doc.key)}
                  disabled={picking === doc.key}
                  accessibilityRole="button"
                  accessibilityLabel={`Sélectionner ${doc.label}`}
                >
                  {picking === doc.key
                    ? <ActivityIndicator color="#FFF" size="small" />
                    : <Text style={s.pickBtnText}>{uploaded ? 'Changer' : 'Choisir'}</Text>
                  }
                </TouchableOpacity>
              </View>
            );
          })}
          {attempted && !requiredUploaded && (
            <Text style={s.hint}>Veuillez télécharger tous les documents obligatoires.</Text>
          )}
        </View>

        <View style={s.actions}>
          <TouchableOpacity style={s.nextBtn} onPress={handleNext} accessibilityRole="button">
            <Text style={s.nextBtnText}>Continuer</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onBack} accessibilityRole="button">
            <Text style={s.backLink}>Retour</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    safe:         { flex: 1, backgroundColor: t.colors.background },
    progressTrack:{ height: 4, backgroundColor: t.colors.border },
    progressFill: { height: '100%', backgroundColor: t.colors.primary, borderRadius: 2 },
    scroll:       { flexGrow: 1, padding: 24, gap: 24, paddingBottom: 40 },
    header:       { gap: 6 },
    stepLabel:    { fontSize: 12, color: t.colors.textDisabled, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    title:        { fontSize: 24, fontWeight: '800', color: t.colors.text },
    subtitle:     { fontSize: 15, color: t.colors.textSecondary, lineHeight: 22 },
    docList:      { gap: 12 },
    docCard:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: t.colors.border, borderRadius: 14, padding: 14, gap: 12 },
    docCardError: { borderColor: t.colors.error },
    docInfo:      { flex: 1, gap: 3 },
    docLabel:     { fontSize: 14, fontWeight: '600', color: t.colors.text },
    docBadge:     { color: t.colors.textSecondary, fontWeight: '400' },
    docName:      { fontSize: 12, color: t.colors.success, fontWeight: '500' },
    docEmpty:     { fontSize: 12, color: t.colors.textDisabled },
    pickBtn:      { backgroundColor: t.colors.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, minWidth: 72, alignItems: 'center' },
    pickBtnDone:  { backgroundColor: t.colors.success },
    pickBtnText:  { color: '#FFF', fontSize: 13, fontWeight: '700' },
    hint:         { color: t.colors.error, fontSize: 12 },
    actions:      { gap: 12 },
    nextBtn:      { backgroundColor: t.colors.primary, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
    nextBtnText:  { color: '#FFF', fontSize: 16, fontWeight: '700' },
    backLink:     { textAlign: 'center', color: t.colors.textSecondary, fontSize: 14, fontWeight: '600' },
  });
}
