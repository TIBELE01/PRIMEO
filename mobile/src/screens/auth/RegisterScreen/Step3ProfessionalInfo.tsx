import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthTheme, AuthBackground, AuthButtonGradient, type AuthTheme } from '../authDesign';
import type { RegistrationData } from './index';

type Props = {
  data: RegistrationData;
  onUpdate: (patch: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
};

export function Step3ProfessionalInfo({ data, onUpdate, onNext, onBack, currentStep, totalSteps }: Props) {
  const theme = useAuthTheme();
  const s = makeStyles(theme);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const touch = (field: string) => setTouched((p) => ({ ...p, [field]: true }));

  const isRestaurant = data.accountType === 'restaurateur';
  const businessLabel = isRestaurant ? 'Nom du restaurant' : 'Dénomination sociale';

  const errors: Record<string, string | null> = {
    businessName:    !data.businessName.trim() ? 'Champ requis' : null,
    businessAddress: !data.businessAddress.trim() ? 'Champ requis' : null,
    rccm:            !data.rccm.trim() ? 'Champ requis' : null,
    taxNumber:       !data.taxNumber.trim() ? 'Champ requis' : null,
  };

  const canSubmit = Object.values(errors).every((e) => e === null);

  const handleNext = () => {
    setTouched({ businessName: true, businessAddress: true, rccm: true, taxNumber: true });
    if (canSubmit) onNext();
  };

  return (
    <SafeAreaView style={s.safe}>
      <AuthBackground />
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${(currentStep / totalSteps) * 100}%` }]} />
      </View>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.stepLabel}>Étape {currentStep}/{totalSteps}</Text>
          <Text style={s.title}>Informations professionnelles</Text>
          <Text style={s.subtitle}>Ces informations permettent de vérifier votre activité en Côte d'Ivoire.</Text>
        </View>

        <View style={s.form}>
          <View style={s.field}>
            <Text style={s.label}>{businessLabel}</Text>
            <TextInput
              style={[s.input, touched.businessName && errors.businessName ? s.inputError : null]}
              value={data.businessName}
              onChangeText={(v) => onUpdate({ businessName: v })}
              placeholder="Ex : Résidence Les Palmiers"
              placeholderTextColor={theme.colors.textDisabled}
              onBlur={() => touch('businessName')}
              autoCapitalize="words"
              returnKeyType="next"
              accessibilityLabel={businessLabel}
            />
            {touched.businessName && errors.businessName && <Text style={s.hint}>{errors.businessName}</Text>}
          </View>

          <View style={s.field}>
            <Text style={s.label}>Adresse de l'établissement</Text>
            <TextInput
              style={[s.input, touched.businessAddress && errors.businessAddress ? s.inputError : null]}
              value={data.businessAddress}
              onChangeText={(v) => onUpdate({ businessAddress: v })}
              placeholder="Ex : Cocody, Abidjan"
              placeholderTextColor={theme.colors.textDisabled}
              onBlur={() => touch('businessAddress')}
              autoCapitalize="sentences"
              returnKeyType="next"
              accessibilityLabel="Adresse de l'établissement"
            />
            {touched.businessAddress && errors.businessAddress && <Text style={s.hint}>{errors.businessAddress}</Text>}
          </View>

          <View style={s.field}>
            <Text style={s.label}>Numéro RCCM</Text>
            <TextInput
              style={[s.input, touched.rccm && errors.rccm ? s.inputError : null]}
              value={data.rccm}
              onChangeText={(v) => onUpdate({ rccm: v })}
              placeholder="Ex : CI-ABJ-2024-B-12345"
              placeholderTextColor={theme.colors.textDisabled}
              onBlur={() => touch('rccm')}
              autoCapitalize="characters"
              returnKeyType="next"
              accessibilityLabel="Numéro RCCM"
            />
            {touched.rccm && errors.rccm && <Text style={s.hint}>{errors.rccm}</Text>}
          </View>

          <View style={s.field}>
            <Text style={s.label}>Numéro de contribuable</Text>
            <TextInput
              style={[s.input, touched.taxNumber && errors.taxNumber ? s.inputError : null]}
              value={data.taxNumber}
              onChangeText={(v) => onUpdate({ taxNumber: v })}
              placeholder="Ex : 1234567 A"
              placeholderTextColor={theme.colors.textDisabled}
              onBlur={() => touch('taxNumber')}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={handleNext}
              accessibilityLabel="Numéro de contribuable"
            />
            {touched.taxNumber && errors.taxNumber && <Text style={s.hint}>{errors.taxNumber}</Text>}
          </View>
        </View>

        <View style={s.actions}>
          <TouchableOpacity style={s.nextBtn} onPress={handleNext} accessibilityRole="button">
<AuthButtonGradient />
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

function makeStyles(t: AuthTheme) {
  return StyleSheet.create({
    safe:         { flex: 1, paddingTop: 16, backgroundColor: t.colors.background },
    progressTrack:{ height: 6, backgroundColor: t.colors.border, marginHorizontal: 24, borderRadius: 3 },
    progressFill: { height: '100%', backgroundColor: t.colors.primary, borderRadius: 3 },
    scroll:       { flexGrow: 1, padding: 24, gap: 24, paddingBottom: 40 },
    header:       { gap: 6 },
    stepLabel:    { fontSize: 12, color: t.colors.textDisabled, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    title:        { fontSize: 24, fontWeight: '800', color: t.colors.text },
    subtitle:     { fontSize: 15, color: t.colors.textSecondary, lineHeight: 22 },
    form:         { gap: 16 },
    field:        { gap: 6 },
    label:        { fontSize: 14, fontWeight: '600', color: t.colors.text },
    input:        { borderWidth: 1, borderColor: t.auth.highlight, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: t.colors.text, backgroundColor: t.colors.surface , shadowColor: t.auth.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 5 },
    inputError:   { borderColor: t.colors.error },
    hint:         { color: t.colors.error, fontSize: 12 },
    actions:      { gap: 12 },
    nextBtn:      { backgroundColor: t.colors.primary, paddingVertical: 17, borderRadius: 36, alignItems: 'center' , shadowColor: '#0055FF', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.38, shadowRadius: 18, elevation: 10 },
    nextBtnText:  { color: '#FFF', fontSize: 16, fontWeight: '700' },
    backLink:     { textAlign: 'center', color: t.colors.textSecondary, fontSize: 14, fontWeight: '600' },
  });
}
