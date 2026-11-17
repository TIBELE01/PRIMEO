import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthTheme, AuthBackground, type AuthTheme } from '../authDesign';
import { isValidIvorianPhone, validatePassword } from '../auth.utils';
import { signInWithGoogle } from '../../../services/googleAuth';
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
  const theme = useAuthTheme();
  const s = makeStyles(theme);
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Inscription Google : uniquement pour les comptes clients — les
  // professionnels suivent obligatoirement le flux email + OTP + validation admin.
  const isClient = data.accountType === 'client';

  const handleGoogleSignUp = async () => {
    setGoogleError(null);
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.status === 'error') setGoogleError(result.message);
      // 'success' : session ouverte, le RootNavigator bascule sur l'app.
    } finally {
      setGoogleLoading(false);
    }
  };

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
          testID={`register-${key}`}
          style={[s.input, err ? s.inputError : null]}
          value={data[key] as string}
          onChangeText={(v) => onUpdate({ [key]: v } as Partial<RegistrationData>)}
          onBlur={() => touch(key)}
          placeholder={label}
          placeholderTextColor={theme.colors.textDisabled}
          {...props}
        />
        {err && <Text style={s.hint}>{err}</Text>}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <AuthBackground />
      <LinearGradient colors={['#FFFFFF', '#F8FAFC', '#E3EDFF']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <LinearGradient colors={['#BFD6FF', '#EAF1FF']} style={s.shapeTop} pointerEvents="none" />
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${(currentStep / totalSteps) * 100}%` }]} />
      </View>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.stepLabel}>Étape {currentStep}/{totalSteps}</Text>
          <Text style={s.title}>Informations personnelles</Text>
          <Text style={s.subtitle}>Ces informations seront utilisées pour votre compte Primeo.</Text>
        </View>

        {isClient && (
          <View style={s.googleSection}>
            <TouchableOpacity
              style={[s.googleBtn, googleLoading && { opacity: 0.5 }]}
              onPress={handleGoogleSignUp}
              disabled={googleLoading}
              accessibilityRole="button"
              accessibilityLabel="S'inscrire avec Google"
            >
              {googleLoading
                ? <ActivityIndicator color={theme.colors.text} />
                : (
                  <>
                    <Text style={s.googleIcon}>G</Text>
                    <Text style={s.googleBtnText}>S'inscrire avec Google</Text>
                  </>
                )
              }
            </TouchableOpacity>
            {googleError && <Text style={s.hint}>{googleError}</Text>}
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>ou avec votre email</Text>
              <View style={s.dividerLine} />
            </View>
          </View>
        )}

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
                testID="register-password"
                style={[s.input, { flex: 1 }, touched.password && errors.password ? s.inputError : null]}
                value={data.password}
                onChangeText={(v) => onUpdate({ password: v })}
                onBlur={() => touch('password')}
                secureTextEntry={!showPw}
                placeholder="Mot de passe"
                placeholderTextColor={theme.colors.textDisabled}
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
              {['8 caractères minimum', '1 lettre majuscule', '1 lettre minuscule', '1 chiffre'].map((r) => (
                <Text key={r} style={s.rule}>• {r}</Text>
              ))}
            </View>
          </View>

          {/* Confirm password */}
          <View style={s.field}>
            <Text style={s.label}>Confirmer le mot de passe</Text>
            <TextInput
              testID="register-confirmPassword"
              style={[s.input, touched.confirmPassword && errors.confirmPassword ? s.inputError : null]}
              value={data.confirmPassword}
              onChangeText={(v) => onUpdate({ confirmPassword: v })}
              onBlur={() => touch('confirmPassword')}
              secureTextEntry={!showPw}
              placeholder="Confirmez le mot de passe"
              placeholderTextColor={theme.colors.textDisabled}
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleNext}
              accessibilityLabel="Confirmer le mot de passe"
            />
            {touched.confirmPassword && errors.confirmPassword && <Text style={s.hint}>{errors.confirmPassword}</Text>}
          </View>
        </View>

        {/* Code de parrainage — optionnel, aucune validation requise */}
        <View style={s.referralSection}>
          <View style={s.field}>
            <Text style={s.label}>Code de parrainage <Text style={s.optional}>(optionnel)</Text></Text>
            <TextInput
              style={s.input}
              value={data.referralCode ?? ''}
              onChangeText={(v) => onUpdate({ referralCode: v })}
              placeholder="Ex: ABC12345"
              placeholderTextColor={theme.colors.textDisabled}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={handleNext}
              accessibilityLabel="Code de parrainage"
            />
          </View>
        </View>

        <View style={s.actions}>
          <TouchableOpacity testID="register-next" style={s.nextShadow} onPress={handleNext} accessibilityRole="button" activeOpacity={0.9}>
            <LinearGradient colors={['#4F8EF7', '#0055FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.nextBtn}>
              <Text style={s.nextBtnText}>Continuer</Text>
            </LinearGradient>
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
    safe:         { flex: 1, paddingTop: 16, backgroundColor: '#F8FAFC' },
    shapeTop:     { position: 'absolute', width: 280, height: 280, borderRadius: 140, top: -110, left: -80, opacity: 0.7, shadowColor: '#7FA6E8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
    progressTrack:{ height: 6, backgroundColor: '#DCE5F5', marginHorizontal: 24, borderRadius: 3 },
    progressFill: { height: '100%', backgroundColor: '#0055FF', borderRadius: 3 },
    scroll:       { flexGrow: 1, padding: 24, gap: 24, paddingBottom: 40 },
    header:       { gap: 6 },
    stepLabel:    { fontSize: 12, color: t.colors.textDisabled, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    title:        { fontSize: 24, fontWeight: '800', color: t.colors.text },
    subtitle:     { fontSize: 15, color: t.colors.textSecondary, lineHeight: 22 },
    form:         { gap: 16 },
    field:        { gap: 6 },
    label:        { fontSize: 14, fontWeight: '600', color: t.colors.text },
    input:        { borderWidth: 1, borderColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 15, fontSize: 15, color: t.colors.text, backgroundColor: '#F2F6FF', shadowColor: '#7FA6E8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 5 },
    inputError:   { borderColor: '#FF3333' },
    pwRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
    eyeBtn:       { padding: 8 },
    hint:         { color: t.colors.error, fontSize: 12 },
    rules:        { gap: 2, marginTop: 4 },
    rule:         { fontSize: 12, color: t.colors.textSecondary },
    referralSection: { marginTop: 8, borderTopWidth: 1, borderTopColor: t.colors.border, paddingTop: 16 },
    googleSection: { gap: 14 },
    googleBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 20, paddingVertical: 15, backgroundColor: '#FFFFFF', shadowColor: '#7FA6E8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    googleIcon:    { fontSize: 18, fontWeight: '900', color: '#4285F4' },
    googleBtnText: { fontSize: 15, fontWeight: '600', color: t.colors.text },
    dividerRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
    dividerLine:   { flex: 1, height: 1, backgroundColor: t.colors.border },
    dividerText:   { fontSize: 13, color: t.colors.textSecondary, fontWeight: '600' },
    optional: { fontSize: 12, color: t.colors.textDisabled, fontWeight: '400' },
    actions:      { gap: 12 },
    nextShadow:   { borderRadius: 36, shadowColor: '#0055FF', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.38, shadowRadius: 18, elevation: 10 },
    nextBtn:      { paddingVertical: 17, borderRadius: 36, alignItems: 'center' },
    nextBtnText:  { color: '#FFF', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
    backLink:     { textAlign: 'center', color: t.colors.textSecondary, fontSize: 14, fontWeight: '600' },
  });
}
