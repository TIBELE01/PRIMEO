import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView,
} from 'react-native';
import { useTheme, type Theme } from '../../../theme/ThemeProvider';
import { isValidIvorianPhone, validatePassword } from '../auth.utils';
import type { RegistrationData } from './index';

type Props = {
  data: RegistrationData;
  onUpdate: (patch: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
};

export function Step2PersonalInfo({ data, onUpdate, onNext, onBack, currentStep, totalSteps }: Props) {
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const touch = (field: string) => setTouched((p) => ({ ...p, [field]: true }));

  const errors: Record<string, string | null> = {
    firstName:       !data.firstName.trim() ? 'Champ requis' : null,
    lastName:        !data.lastName.trim() ? 'Champ requis' : null,
    email:           !data.email.trim() ? 'Champ requis' : !/^\S+@\S+\.\S+$/.test(data.email) ? 'Email invalide' : null,
    phone:           !data.phone.trim() ? 'Champ requis' : !isValidIvorianPhone(data.phone) ? 'Numéro ivoirien invalide (+225)' : null,
    password:        validatePassword(data.password),
    confirmPassword: data.confirmPassword && data.password !== data.confirmPassword ? 'Les mots de passe ne correspondent pas' : (!data.confirmPassword ? 'Champ requis' : null),
  };

  const canSubmit = Object.values(errors).every((e) => e === null);

  const handleNext = () => {
    setTouched({ firstName: true, lastName: true, email: true, phone: true, password: true, confirmPassword: true });
    if (canSubmit) onNext();
  };

  const field = (
    key: keyof RegistrationData,
    label: string,
    props: React.ComponentProps<typeof TextInput>,
  ) => {
    const err = touched[key] ? errors[key] : null;
    return (
      <View style={s.field}>
        <Text style={s.label}>{label}</Text>
        <TextInput
          style={[s.input, err ? s.inputError : null]}
          value={data[key] as string}
          onChangeText={(v) => onUpdate({ [key]: v } as Partial<RegistrationData>)}
          onBlur={() => touch(key)}
          placeholderTextColor={theme.colors.textDisabled}
          {...props}
        />
        {err && <Text style={s.hint}>{err}</Text>}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${(currentStep / totalSteps) * 100}%` }]} />
      </View>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.stepLabel}>Étape {currentStep}/{totalSteps}</Text>
          <Text style={s.title}>Informations personnelles</Text>
          <Text style={s.subtitle}>Ces informations seront utilisées pour votre compte Primeo.</Text>
        </View>

        <View style={s.form}>
          {field('firstName', 'Prénom', { autoCapitalize: 'words', returnKeyType: 'next', accessibilityLabel: 'Prénom' })}
          {field('lastName', 'Nom', { autoCapitalize: 'words', returnKeyType: 'next', accessibilityLabel: 'Nom' })}
          {field('email', 'Adresse e-mail', { keyboardType: 'email-address', autoCapitalize: 'none', returnKeyType: 'next', accessibilityLabel: 'Adresse e-mail' })}
          {field('phone', 'Téléphone (+225)', { keyboardType: 'phone-pad', placeholder: '0X XX XX XX XX', returnKeyType: 'next', accessibilityLabel: 'Numéro de téléphone' })}

          {/* Password with toggle */}
          <View style={s.field}>
            <Text style={s.label}>Mot de passe</Text>
            <View style={s.pwRow}>
              <TextInput
                style={[s.input, { flex: 1 }, touched.password && errors.password ? s.inputError : null]}
                value={data.password}
                onChangeText={(v) => onUpdate({ password: v })}
                onBlur={() => touch('password')}
                secureTextEntry={!showPw}
                textContentType="newPassword"
                returnKeyType="next"
                accessibilityLabel="Mot de passe"
              />
              <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPw((v) => !v)}>
                <Text>{showPw ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
            {touched.password && errors.password && <Text style={s.hint}>{errors.password}</Text>}
            <View style={s.rules}>
              {['8 caractères minimum', '1 lettre majuscule', '1 chiffre'].map((r) => (
                <Text key={r} style={s.rule}>• {r}</Text>
              ))}
            </View>
          </View>

          {/* Confirm password */}
          <View style={s.field}>
            <Text style={s.label}>Confirmer le mot de passe</Text>
            <TextInput
              style={[s.input, touched.confirmPassword && errors.confirmPassword ? s.inputError : null]}
              value={data.confirmPassword}
              onChangeText={(v) => onUpdate({ confirmPassword: v })}
              onBlur={() => touch('confirmPassword')}
              secureTextEntry={!showPw}
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleNext}
              accessibilityLabel="Confirmer le mot de passe"
            />
            {touched.confirmPassword && errors.confirmPassword && <Text style={s.hint}>{errors.confirmPassword}</Text>}
          </View>
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
    form:         { gap: 16 },
    field:        { gap: 6 },
    label:        { fontSize: 14, fontWeight: '600', color: t.colors.text },
    input:        { borderWidth: 1.5, borderColor: t.colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: t.colors.text, backgroundColor: t.colors.surface },
    inputError:   { borderColor: t.colors.error },
    pwRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
    eyeBtn:       { padding: 8 },
    hint:         { color: t.colors.error, fontSize: 12 },
    rules:        { gap: 2, marginTop: 4 },
    rule:         { fontSize: 12, color: t.colors.textSecondary },
    actions:      { gap: 12 },
    nextBtn:      { backgroundColor: t.colors.primary, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
    nextBtnText:  { color: '#FFF', fontSize: 16, fontWeight: '700' },
    backLink:     { textAlign: 'center', color: t.colors.textSecondary, fontSize: 14, fontWeight: '600' },
  });
}
