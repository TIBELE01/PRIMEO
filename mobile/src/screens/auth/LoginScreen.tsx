// Login screen — email + password, 2FA redirect, auto-session on success
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, type Theme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api/endpoints/auth';
import { signInWithGoogle } from '../../services/googleAuth';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import type { AuthScreenProps } from '../../navigation/types';
import { trackEvent } from '../../services/analytics';

type Props = AuthScreenProps<'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const setUser   = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);
  const s = makeStyles(theme);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length >= 1;

  const handleLogin = async () => {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const { data } = await authApi.login(email.trim().toLowerCase(), password);

      if (data.requiresTwoFactor) {
        navigation.navigate('TwoFactor', { userId: data.userId as string });
        return;
      }

      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN,  data.accessToken as string);
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken as string);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(data.user));

      setTokens(data.accessToken as string, data.refreshToken as string);
      setUser(data.user);
      // Statistique anonyme (rôle générique uniquement, soumis au consentement)
      trackEvent('login', undefined, (data.user as { accountType?: string })?.accountType === 'client' ? 'client' : 'professional');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } } };
      const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? 'Email ou mot de passe incorrect';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Connexion Google (Supabase OAuth) — réservée aux comptes clients ;
  // le backend refuse les comptes professionnels avec un message explicite.
  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.status === 'error') setError(result.message);
      // 'success' : le store est mis à jour, la navigation bascule automatiquement.
      // 'cancelled' : l'utilisateur a fermé le navigateur, rien à faire.
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <View style={s.header}>
            <Text style={s.title}>Connexion</Text>
            <Text style={s.subtitle}>Bienvenue sur Primeo</Text>
          </View>

          <View style={s.form}>
            {error && (
              <View style={s.errorBox} accessibilityLiveRegion="polite">
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            <View style={s.field}>
              <Text style={s.label}>Adresse e-mail</Text>
              <TextInput
                style={s.input}
                placeholder="vous@exemple.ci"
                placeholderTextColor={theme.colors.textDisabled}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                accessibilityLabel="Champ e-mail"
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>Mot de passe</Text>
              <View style={s.pwRow}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor={theme.colors.textDisabled}
                  secureTextEntry={!showPw}
                  textContentType="password"
                  autoComplete="password"
                  value={password}
                  onChangeText={setPassword}
                  onSubmitEditing={handleLogin}
                  returnKeyType="done"
                  accessibilityLabel="Champ mot de passe"
                />
                <TouchableOpacity
                  style={s.eyeBtn}
                  onPress={() => setShowPw((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  <Text style={s.eyeText}>{showPw ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} accessibilityRole="link">
              <Text style={s.forgotLink}>Mot de passe oublié ?</Text>
            </TouchableOpacity>
          </View>

          <View style={s.footer}>
            <TouchableOpacity
              style={[s.submitBtn, (!canSubmit || loading) && s.btnDisabled]}
              onPress={handleLogin}
              disabled={!canSubmit || loading}
              accessibilityRole="button"
              accessibilityLabel="Se connecter"
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={s.submitBtnText}>Se connecter</Text>
              }
            </TouchableOpacity>

            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>ou</Text>
              <View style={s.dividerLine} />
            </View>

            <TouchableOpacity
              style={[s.googleBtn, googleLoading && s.btnDisabled]}
              onPress={handleGoogleLogin}
              disabled={googleLoading || loading}
              accessibilityRole="button"
              accessibilityLabel="Se connecter avec Google"
            >
              {googleLoading
                ? <ActivityIndicator color={theme.colors.text} />
                : (
                  <>
                    <Text style={s.googleIcon}>G</Text>
                    <Text style={s.googleBtnText}>Se connecter avec Google</Text>
                  </>
                )
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Register', { role: 'client' })} accessibilityRole="link">
              <Text style={s.registerLink}>
                Pas encore de compte ?{' '}
                <Text style={s.registerLinkBold}>Créer un compte</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.proBtn}
              onPress={() => navigation.navigate('ProRegister')}
              accessibilityRole="button"
              accessibilityLabel="Inscription professionnelle"
              accessibilityHint="Ouvre le formulaire d'inscription pour les professionnels"
            >
              <Text style={s.proBtnText}>🏢 Inscription professionnelle</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    safe:             { flex: 1, backgroundColor: t.colors.background },
    scroll:           { flexGrow: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24, justifyContent: 'space-between', gap: 32 },
    header:           { gap: 4 },
    title:            { fontSize: 28, fontWeight: '800', color: t.colors.text },
    subtitle:         { fontSize: 16, color: t.colors.textSecondary },
    form:             { gap: 16 },
    field:            { gap: 6 },
    label:            { fontSize: 14, fontWeight: '600', color: t.colors.text },
    input:            { borderWidth: 1.5, borderColor: t.colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: t.colors.text, backgroundColor: t.colors.surface },
    pwRow:            { flexDirection: 'row', alignItems: 'center', gap: 8 },
    eyeBtn:           { padding: 8 },
    eyeText:          { fontSize: 18 },
    forgotLink:       { color: t.colors.primary, fontSize: 14, textAlign: 'right', marginTop: 4 },
    errorBox:         { backgroundColor: t.colors.errorLight, borderRadius: 10, padding: 12 },
    errorText:        { color: t.colors.error, fontSize: 14 },
    footer:           { gap: 16 },
    submitBtn:        { backgroundColor: t.colors.primary, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
    btnDisabled:      { opacity: 0.5 },
    submitBtnText:    { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    registerLink:     { textAlign: 'center', color: t.colors.textSecondary, fontSize: 14 },
    registerLinkBold: { color: t.colors.primary, fontWeight: '700' },
    proBtn:           { borderWidth: 1.5, borderColor: t.colors.border, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    proBtnText:       { fontSize: 15, fontWeight: '600', color: t.colors.text },
    dividerRow:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
    dividerLine:      { flex: 1, height: 1, backgroundColor: t.colors.border },
    dividerText:      { fontSize: 13, color: t.colors.textSecondary, fontWeight: '600' },
    googleBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderColor: t.colors.border, borderRadius: 14, paddingVertical: 14, backgroundColor: t.colors.surface },
    googleIcon:       { fontSize: 18, fontWeight: '900', color: '#4285F4' },
    googleBtnText:    { fontSize: 15, fontWeight: '600', color: t.colors.text },
  });
}
