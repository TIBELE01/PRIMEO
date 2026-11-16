// Login screen — design néo-/glassmorphique aux couleurs Primeo : fond dégradé doux,
// formes abstraites floues, logo en carte flottante, champs en relief, bouton pilule
// dégradé. Logique inchangée (2FA, Google, session, inscription client / pro).
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView, Image, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { secureStore as SecureStore } from '../../services/secureStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api/endpoints/auth';
import { signInWithGoogle } from '../../services/googleAuth';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import type { AuthScreenProps } from '../../navigation/types';
import { trackEvent } from '../../services/analytics';
import { PRIMEO_LOGO_URL } from '../../components/common/Logo';
import { BLUE, BLUE_LIGHT, ORANGE, RED, AuthBackground, useAuthPalette, type AuthPalette } from './authDesign';

type Props = AuthScreenProps<'Login'>;

export function LoginScreen({ navigation }: Props) {
  const setUser   = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [remember, setRemember] = useState(true);

  const { P, isDark, toggle } = useAuthPalette();
  const s = makeStyles(P);

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
      trackEvent('login', undefined, (data.user as { accountType?: string })?.accountType === 'client' ? 'client' : 'professional');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } } };
      const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? 'Email ou mot de passe incorrect';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.status === 'error') setError(result.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={P.bg[0]} />
      <AuthBackground />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Bouton thème (clair / sombre) */}
            <View style={s.topBar}>
              <TouchableOpacity
                style={s.roundBtn}
                onPress={toggle}
                accessibilityRole="button"
                accessibilityLabel={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
                activeOpacity={0.85}
              >
                <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={BLUE} />
              </TouchableOpacity>
            </View>

            {/* Logo en carte flottante */}
            <View style={s.logoCard}>
              <Image source={{ uri: PRIMEO_LOGO_URL }} resizeMode="contain" style={s.logo} accessibilityLabel="Logo Primeo" />
            </View>

            <Text style={s.title} accessibilityRole="header">Bienvenue sur Primeo</Text>
            <Text style={s.subtitle}>Connectez-vous pour continuer</Text>

            {error && (
              <View style={s.errorBox} accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle" size={18} color={RED} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            {/* Champs en relief */}
            <View style={s.fieldShadow}>
              <View style={s.inputRow}>
                <Ionicons name="person-outline" size={20} color={BLUE} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="Email"
                  placeholderTextColor={P.placeholder}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                  accessibilityLabel="Champ e-mail"
                />
              </View>
            </View>

            <View style={s.fieldShadow}>
              <View style={s.inputRow}>
                <Ionicons name="lock-closed-outline" size={20} color={BLUE} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="Mot de passe"
                  placeholderTextColor={P.placeholder}
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
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={P.muted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Se souvenir de moi / Mot de passe oublié */}
            <View style={s.optionsRow}>
              <TouchableOpacity
                style={s.rememberWrap}
                onPress={() => setRemember((v) => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: remember }}
                accessibilityLabel="Se souvenir de moi"
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
              >
                <View style={[s.checkbox, remember && s.checkboxOn]}>
                  {remember && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <Text style={s.rememberText}>Se souvenir de moi</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} accessibilityRole="link" hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}>
                <Text style={s.forgotLink}>Mot de passe oublié ?</Text>
              </TouchableOpacity>
            </View>

            {/* Bouton pilule en dégradé */}
            <TouchableOpacity
              style={[s.primaryShadow, (!canSubmit || loading) && s.btnDisabled]}
              onPress={handleLogin}
              disabled={!canSubmit || loading}
              accessibilityRole="button"
              accessibilityLabel="Se connecter"
              accessibilityState={{ disabled: !canSubmit || loading }}
              activeOpacity={0.9}
            >
              <LinearGradient colors={[BLUE_LIGHT, BLUE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.primaryBtn}>
                {loading
                  ? <ActivityIndicator color="#FFFFFF" />
                  : (
                    <>
                      <Text style={s.primaryBtnText}>Se connecter</Text>
                      <View style={s.arrowCircle}>
                        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                      </View>
                    </>
                  )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Séparateur */}
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>OU CONTINUER AVEC</Text>
              <View style={s.dividerLine} />
            </View>

            {/* Connexion sociale */}
            <View style={s.socialRow}>
              <TouchableOpacity
                style={[s.socialBtn, googleLoading && s.btnDisabled]}
                onPress={handleGoogleLogin}
                disabled={googleLoading || loading}
                accessibilityRole="button"
                accessibilityLabel="Se connecter avec Google"
                activeOpacity={0.88}
              >
                {googleLoading
                  ? <ActivityIndicator color={BLUE} />
                  : <Text style={s.googleIcon}>G</Text>}
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('Register', { role: 'client' })} accessibilityRole="link" style={s.registerWrap}>
              <Text style={s.registerLink}>
                Pas encore de compte ?{' '}
                <Text style={s.registerLinkBold}>Créer un compte</Text>
              </Text>
            </TouchableOpacity>

            {/* Inscription professionnelle (conservée) */}
            <TouchableOpacity
              style={s.proBtn}
              onPress={() => navigation.navigate('ProRegister')}
              accessibilityRole="button"
              accessibilityLabel="Inscription professionnelle"
              accessibilityHint="Ouvre le formulaire d'inscription pour les professionnels"
              activeOpacity={0.88}
            >
              <Ionicons name="briefcase-outline" size={18} color={ORANGE} />
              <Text style={s.proBtnText}>Inscription professionnelle</Text>
            </TouchableOpacity>

            <Text style={s.tagline}>RÉSERVEZ · DÉCOUVREZ · VIVEZ</Text>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(P: AuthPalette) {
  const soft = { shadowColor: P.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 };
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: P.bg[1] },
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24, alignItems: 'stretch', maxWidth: 520, width: '100%', alignSelf: 'center' },

    topBar: { alignItems: 'flex-end', paddingTop: 10 },
    roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: P.surface, alignItems: 'center', justifyContent: 'center', ...soft, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },

    logoCard: { alignSelf: 'center', width: 112, height: 112, borderRadius: 32, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginTop: 4, marginBottom: 22, ...soft, shadowOpacity: 0.45, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 14 },
    logo: { width: 84, height: 84 },

    title: { fontSize: 28, fontWeight: '900', color: P.text, textAlign: 'center', letterSpacing: -0.4 },
    subtitle: { fontSize: 13, color: P.muted, textAlign: 'center', letterSpacing: 1.5, marginTop: 8, marginBottom: 26 },

    errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,51,51,0.08)', borderWidth: 1, borderColor: 'rgba(255,51,51,0.35)', borderRadius: 16, padding: 12, marginBottom: 16 },
    errorText: { color: RED, fontSize: 13.5, flex: 1, fontWeight: '600' },

    fieldShadow: { borderRadius: 20, marginBottom: 16, backgroundColor: P.field, ...soft, shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
    inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, borderColor: P.highlight, backgroundColor: P.field, paddingHorizontal: 16, minHeight: 56 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, paddingVertical: 15, fontSize: 15, color: P.text },
    eyeBtn: { padding: 8, marginRight: -6 },

    optionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, marginTop: 2 },
    rememberWrap: { flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1 },
    checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: BLUE, alignItems: 'center', justifyContent: 'center', backgroundColor: P.surface },
    checkboxOn: { backgroundColor: BLUE },
    rememberText: { fontSize: 13.5, color: P.text, fontWeight: '600' },
    forgotLink: { color: BLUE, fontSize: 13.5, fontWeight: '700' },

    primaryShadow: { borderRadius: 36, shadowColor: BLUE, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.38, shadowRadius: 18, elevation: 10 },
    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 36, paddingVertical: 16, paddingHorizontal: 22, minHeight: 58 },
    primaryBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
    arrowCircle: { position: 'absolute', right: 10, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
    btnDisabled: { opacity: 0.55 },

    dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 26, marginBottom: 20 },
    dividerLine: { flex: 1, height: 1, backgroundColor: P.line },
    dividerText: { fontSize: 11.5, color: P.muted, fontWeight: '700', letterSpacing: 1.5 },

    socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 18 },
    socialBtn: { width: 64, height: 64, borderRadius: 20, backgroundColor: P.surface, alignItems: 'center', justifyContent: 'center', ...soft, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
    googleIcon: { fontSize: 26, fontWeight: '900', color: '#4285F4' },

    registerWrap: { marginTop: 24 },
    registerLink: { textAlign: 'center', color: P.muted, fontSize: 14 },
    registerLinkBold: { color: BLUE, fontWeight: '800' },

    proBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: ORANGE, borderRadius: 30, paddingVertical: 14, marginTop: 16, backgroundColor: P.surface, shadowColor: ORANGE, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 4 },
    proBtnText: { fontSize: 15, fontWeight: '800', color: ORANGE },

    tagline: { marginTop: 30, textAlign: 'center', fontSize: 11, fontWeight: '700', color: P.muted, letterSpacing: 2.2 },
  });
}
