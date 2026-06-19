// Reset password — new password form, accepts token from deep link or OTP context
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, type Theme } from '../../theme/ThemeProvider';
import { authApi } from '../../services/api/endpoints/auth';
import { validatePassword } from './auth.utils';
import type { AuthScreenProps } from '../../navigation/types';

type Props = AuthScreenProps<'ResetPassword'>;

export function ResetPasswordScreen({ route, navigation }: Props) {
  // Cible de deep link (primeo://reset-password) : params absents si le lien
  // est ouvert sans fragment — ne jamais déstructurer sans repli.
  const { recoveryToken = '' } = route.params ?? {};
  const { theme } = useTheme();
  const s = makeStyles(theme);

  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [success,   setSuccess]   = useState(false);

  const pwError      = password ? validatePassword(password) : null;
  const confirmError = confirm && password !== confirm ? 'Les mots de passe ne correspondent pas' : null;
  const canSubmit    = !pwError && !confirmError && password.length > 0 && confirm.length > 0;

  const handleReset = async () => {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      await authApi.resetPassword(recoveryToken, password);
      setSuccess(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } } };
      const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? 'Erreur lors de la réinitialisation. Le lien a peut-être expiré.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.successContainer}>
          <Text style={s.successIcon}>✅</Text>
          <Text style={s.successTitle}>Mot de passe modifié</Text>
          <Text style={s.successText}>
            Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.
          </Text>
          <TouchableOpacity
            style={s.sendBtn}
            onPress={() => navigation.navigate('Login')}
            accessibilityRole="button"
          >
            <Text style={s.sendBtnText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <View style={s.header}>
            <Text style={s.title}>Nouveau mot de passe</Text>
            <Text style={s.subtitle}>Choisissez un mot de passe sécurisé.</Text>
          </View>

          <View style={s.requirements}>
            {['8 caractères minimum', '1 lettre majuscule', '1 chiffre'].map((r) => (
              <Text key={r} style={s.req}>• {r}</Text>
            ))}
          </View>

          <View style={s.form}>
            {error && (
              <View style={s.errorBox} accessibilityLiveRegion="polite">
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            <View style={s.field}>
              <Text style={s.label}>Nouveau mot de passe</Text>
              <View style={s.pwRow}>
                <TextInput
                  style={[s.input, { flex: 1 }, pwError ? s.inputError : null]}
                  placeholder="••••••••"
                  placeholderTextColor={theme.colors.textDisabled}
                  secureTextEntry={!showPw}
                  textContentType="newPassword"
                  value={password}
                  onChangeText={setPassword}
                  accessibilityLabel="Nouveau mot de passe"
                />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPw((v) => !v)}>
                  <Text>{showPw ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>
              {pwError && <Text style={s.hint}>{pwError}</Text>}
            </View>

            <View style={s.field}>
              <Text style={s.label}>Confirmer</Text>
              <TextInput
                style={[s.input, confirmError ? s.inputError : null]}
                placeholder="••••••••"
                placeholderTextColor={theme.colors.textDisabled}
                secureTextEntry={!showPw}
                textContentType="newPassword"
                value={confirm}
                onChangeText={setConfirm}
                onSubmitEditing={handleReset}
                returnKeyType="done"
                accessibilityLabel="Confirmer le nouveau mot de passe"
              />
              {confirmError && <Text style={s.hint}>{confirmError}</Text>}
            </View>
          </View>

          <View style={s.footer}>
            <TouchableOpacity
              style={[s.sendBtn, (!canSubmit || loading) && s.btnDisabled]}
              onPress={handleReset}
              disabled={!canSubmit || loading}
              accessibilityRole="button"
            >
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.sendBtnText}>Réinitialiser</Text>}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    safe:             { flex: 1, paddingTop: 16, backgroundColor: t.colors.background },
    scroll:           { flexGrow: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24, gap: 24 },
    successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
    successIcon:      { fontSize: 48 },
    successTitle:     { fontSize: 24, fontWeight: '800', color: t.colors.success },
    successText:      { fontSize: 15, color: t.colors.textSecondary, textAlign: 'center', lineHeight: 22 },
    header:           { gap: 6 },
    title:            { fontSize: 26, fontWeight: '800', color: t.colors.text },
    subtitle:         { fontSize: 15, color: t.colors.textSecondary, lineHeight: 22 },
    requirements:     { gap: 4 },
    req:              { fontSize: 13, color: t.colors.textSecondary },
    form:             { gap: 16 },
    field:            { gap: 6 },
    label:            { fontSize: 14, fontWeight: '600', color: t.colors.text },
    input:            { borderWidth: 1.5, borderColor: t.colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: t.colors.text, backgroundColor: t.colors.surface },
    inputError:       { borderColor: t.colors.error },
    pwRow:            { flexDirection: 'row', alignItems: 'center', gap: 8 },
    eyeBtn:           { padding: 8 },
    hint:             { color: t.colors.error, fontSize: 12 },
    errorBox:         { backgroundColor: t.colors.errorLight, borderRadius: 10, padding: 12 },
    errorText:        { color: t.colors.error, fontSize: 14 },
    footer:           { gap: 14 },
    sendBtn:          { backgroundColor: t.colors.primary, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
    btnDisabled:      { opacity: 0.5 },
    sendBtnText:      { color: '#FFF', fontSize: 16, fontWeight: '700' },
  });
}
