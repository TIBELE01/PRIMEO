import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthTheme, AuthBackground, AuthButtonGradient, type AuthTheme } from '../authDesign';
import type { RegistrationData } from './index';
import { useSectorFlags } from '../../../hooks/useSectorFlags';
import { filterEnabledOptions, sectorOfAccountType } from '../../../utils/sectors';

type Props = {
  data: RegistrationData;
  onUpdate: (patch: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
};

const ACCOUNT_OPTIONS = [
  {
    value: 'client' as const,
    emoji: '👤',
    label: 'Client',
    description: 'Cherchez et réservez des hébergements, restaurants et biens immobiliers.',
  },
  {
    value: 'professional_hebergement' as const,
    emoji: '🏠',
    label: 'Résidence / Appartement',
    description: 'Louez vos résidences meublées, appartements ou maisons.',
  },
  {
    value: 'professional_hotel' as const,
    emoji: '🏨',
    label: 'Hôtel',
    description: 'Gérez les chambres et réservations de votre établissement hôtelier.',
  },
  {
    value: 'professional_immobilier' as const,
    emoji: '🏢',
    label: 'Immobilier',
    description: 'Publiez des biens immobiliers à la vente ou à la location longue durée.',
  },
  {
    value: 'restaurateur' as const,
    emoji: '🍽️',
    label: 'Restaurateur',
    description: 'Gérez les réservations de table et votre carte.',
  },
];

export function Step1AccountType({ data, onUpdate, onNext, onBack, currentStep, totalSteps }: Props) {
  const theme = useAuthTheme();
  const s = makeStyles(theme);
  // Un type de compte dont le secteur est désactivé par l'admin n'est pas proposé
  const { sectors } = useSectorFlags();
  const accountOptions = filterEnabledOptions(ACCOUNT_OPTIONS, sectors, (o) => sectorOfAccountType(o.value));

  return (
    <SafeAreaView style={s.safe}>
      <AuthBackground />
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${(currentStep / totalSteps) * 100}%` }]} />
      </View>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.stepLabel}>Étape {currentStep}/{totalSteps}</Text>
          <Text style={s.title}>Type de compte</Text>
          <Text style={s.subtitle}>Choisissez le profil qui correspond à votre usage de Primeo.</Text>
        </View>

        <View style={s.options}>
          {accountOptions.map((opt) => {
            const selected = data.accountType === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[s.option, selected && s.optionSelected]}
                onPress={() => onUpdate({ accountType: opt.value })}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
              >
                <View style={s.optionRow}>
                  <Text style={s.emoji}>{opt.emoji}</Text>
                  <View style={s.optionText}>
                    <Text style={[s.optionLabel, selected && s.optionLabelSelected]}>{opt.label}</Text>
                    <Text style={s.optionDesc}>{opt.description}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={s.actions}>
          <TouchableOpacity
            style={[s.nextBtn, !data.accountType && s.btnDisabled]}
            onPress={onNext}
            disabled={!data.accountType}
            accessibilityRole="button"
          >
<AuthButtonGradient />
            <Text style={s.nextBtnText}>Continuer</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onBack} accessibilityRole="button">
            <Text style={s.backLink}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(t: AuthTheme) {
  return StyleSheet.create({
    safe:               { flex: 1, paddingTop: 16, backgroundColor: t.colors.background },
    progressTrack:      { height: 6, backgroundColor: t.colors.border, marginHorizontal: 24, borderRadius: 3 },
    progressFill:       { height: '100%', backgroundColor: t.colors.primary, borderRadius: 3 },
    scroll:             { flexGrow: 1, padding: 24, gap: 24 },
    header:             { gap: 6 },
    stepLabel:          { fontSize: 12, color: t.colors.textDisabled, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    title:              { fontSize: 24, fontWeight: '800', color: t.colors.text },
    subtitle:           { fontSize: 15, color: t.colors.textSecondary, lineHeight: 22 },
    options:            { gap: 12 },
    option:             { borderWidth: 1, borderColor: t.auth.highlight, borderRadius: 20, padding: 16 , shadowColor: t.auth.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 5 },
    optionSelected:     { borderColor: t.colors.primary, backgroundColor: t.colors.primaryLight },
    optionRow:          { flexDirection: 'row', alignItems: 'center', gap: 14 },
    emoji:              { fontSize: 28 },
    optionText:         { flex: 1, gap: 2 },
    optionLabel:        { fontSize: 16, fontWeight: '700', color: t.colors.text },
    optionLabelSelected:{ color: t.colors.primary },
    optionDesc:         { fontSize: 13, color: t.colors.textSecondary, lineHeight: 18 },
    actions:            { gap: 12, marginTop: 8 },
    nextBtn:            { backgroundColor: t.colors.primary, paddingVertical: 17, borderRadius: 36, alignItems: 'center' , shadowColor: '#0055FF', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.38, shadowRadius: 18, elevation: 10 },
    btnDisabled:        { opacity: 0.4 },
    nextBtnText:        { color: '#FFF', fontSize: 16, fontWeight: '700' },
    backLink:           { textAlign: 'center', color: t.colors.textSecondary, fontSize: 14, fontWeight: '600' },
  });
}
