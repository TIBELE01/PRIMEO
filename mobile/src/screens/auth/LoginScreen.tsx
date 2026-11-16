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
import { BLUE, BLUE_LIGHT, ORANGE, RED, AuthBackground, Neu, useAuthPalette, type AuthPalette } from './authDesign';

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
                onPress={toggle}
                accessibilityRole="button"
                accessibilityLabel={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
                activeOpacity={0.85}
              >
                <Neu radius={16} innerStyle={s.roundInner}>
                  <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={isDark ? '#FFD76A' : '#0B1F4D'} />
                </Neu>
              </TouchableOpacity>
            </View>

            {/* Logo en carte de verre flottante */}
            <Neu radius={46} depth={1.4} style={s.logoWrap} innerStyle={s.logoInner}>
              <Image source={{ uri: PRIMEO_LOGO_URL }} resizeMode="contain" style={s.logo} accessibilityLabel="Logo Primeo" />
            </Neu>

            <Text style={s.title} accessibilityRole="header">Bienvenue sur Primeo</Text>
            <Text style={s.subtitle}>Connectez-vous pour continuer</Text>

            {error && (
              <View style={s.errorBox} accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle" size={18} color={RED} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            {/* Champs en relief */}
            <Neu radius={26} style={s.fieldWrap} innerStyle={s.inputRow}>
              <Ionicons name="person-outline" size={24} color={P.muted} style={s.inputIcon} />
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
            </Neu>

            <Neu radius={26} style={s.fieldWrap} innerStyle={s.inputRow}>
              <Ionicons name="lock-closed-outline" size={24} color={P.muted} style={s.inputIcon} />
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
                <Ionicons name={showPw ? 'eye-outline' : 'eye-off-outline'} size={24} color={P.muted} />
              </TouchableOpacity>
            </Neu>

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
                  {remember && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
                </View>
                <Text style={s.rememberText}>Se souvenir de moi</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} accessibilityRole="link" hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}>
                <Text style={s.forgotLink}>Mot de passe oublié ?</Text>
              </TouchableOpacity>
            </View>

            {/* Bouton pilule en dégradé lumineux */}
            <TouchableOpacity
              style={[s.primaryShadow, (!canSubmit || loading) && s.btnDisabled]}
              onPress={handleLogin}
              disabled={!canSubmit || loading}
              accessibilityRole="button"
              accessibilityLabel="Se connecter"
              accessibilityState={{ disabled: !canSubmit || loading }}
              activeOpacity={0.9}
            >
              <LinearGradient colors={[BLUE_LIGHT, BLUE, '#2E4BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.primaryBtn}>
                {loading
                  ? <ActivityIndicator color="#FFFFFF" />
                  : (
                    <>
                      <Text style={s.primaryBtnText}>Se connecter</Text>
                      <View style={s.arrowCircle}>
                        <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
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
                onPress={handleGoogleLogin}
                disabled={googleLoading || loading}
                accessibilityRole="button"
                accessibilityLabel="Se connecter avec Google"
                activeOpacity={0.88}
                style={googleLoading ? s.btnDisabled : undefined}
              >
                <Neu radius={26} innerStyle={s.socialInner}>
                  {googleLoading
                    ? <ActivityIndicator color={BLUE} />
                    : <Text style={s.googleIcon}>G</Text>}
                </Neu>
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
              onPress={() => navigation.navigate('ProRegister')}
              accessibilityRole="button"
              accessibilityLabel="Inscription professionnelle"
              accessibilityHint="Ouvre le formulaire d'inscription pour les professionnels"
              activeOpacity={0.88}
              style={s.proWrap}
            >
              <Neu radius={30} innerStyle={s.proInner}>
                <Ionicons name="briefcase-outline" size={18} color={ORANGE} />
                <Text style={s.proBtnText}>Inscription professionnelle</Text>
              </Neu>
            </TouchableOpacity>

            <Text style={s.tagline}>RÉSERVEZ  •  DÉCOUVREZ  •  VIVEZ</Text>
            <View style={s.moreWrap}>
              <Text style={s.moreText}>{'PLUS QU\'UNE\nSIMPLE\nRÉSERVATION'}</Text>
              <View style={s.moreLine} />
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(P: AuthPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: P.bg[1] },
    scroll: { flexGrow: 1, paddingHorizontal: 26, paddingBottom: 24, maxWidth: 520, width: '100%', alignSelf: 'center' },

    topBar: { alignItems: 'flex-end', paddingTop: 10 },
    roundInner: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },

    logoWrap: { alignSelf: 'center', marginTop: 6, marginBottom: 26 },
    logoInner: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
    logo: { width: 104, height: 104 },

    title: { fontSize: 32, fontWeight: '900', color: P.text, textAlign: 'center', letterSpacing: -0.5 },
    subtitle: { fontSize: 14, color: P.muted, textAlign: 'center', letterSpacing: 3, marginTop: 10, marginBottom: 30 },

    errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,51,51,0.08)', borderWidth: 1, borderColor: 'rgba(255,51,51,0.35)', borderRadius: 18, padding: 12, marginBottom: 16 },
    errorText: { color: RED, fontSize: 13.5, flex: 1, fontWeight: '600' },

    fieldWrap: { marginBottom: 18 },
    inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, minHeight: 64 },
    inputIcon: { marginRight: 16 },
    input: { flex: 1, paddingVertical: 16, fontSize: 16, color: P.text },
    eyeBtn: { padding: 8, marginRight: -8 },

    optionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, marginTop: 2 },
    rememberWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
    checkbox: { width: 30, height: 30, borderRadius: 9, borderWidth: 2, borderColor: BLUE, alignItems: 'center', justifyContent: 'center', backgroundColor: P.field },
    checkboxOn: { backgroundColor: BLUE, shadowColor: BLUE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
    rememberText: { fontSize: 15, color: P.text, fontWeight: '500' },
    forgotLink: { color: BLUE, fontSize: 15, fontWeight: '700' },

    primaryShadow: { borderRadius: 40, shadowColor: '#3B6BFF', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 },
    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 40, paddingVertical: 18, paddingHorizontal: 22, minHeight: 66, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.55)' },
    primaryBtnText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', letterSpacing: 0.3 },
    arrowCircle: { position: 'absolute', right: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
    btnDisabled: { opacity: 0.55 },

    dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 30, marginBottom: 22 },
    dividerLine: { flex: 1, height: 1, backgroundColor: P.line },
    dividerText: { fontSize: 12, color: P.muted, fontWeight: '700', letterSpacing: 3 },

    socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 22 },
    socialInner: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
    googleIcon: { fontSize: 36, fontWeight: '900', color: '#4285F4' },

    registerWrap: { marginTop: 26 },
    registerLink: { textAlign: 'center', color: P.muted, fontSize: 14.5 },
    registerLinkBold: { color: BLUE, fontWeight: '800' },

    proWrap: { marginTop: 16 },
    proInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 20 },
    proBtnText: { fontSize: 15, fontWeight: '800', color: ORANGE },

    tagline: { marginTop: 34, textAlign: 'center', fontSize: 12, fontWeight: '600', color: P.muted, letterSpacing: 3 },
    moreWrap: { alignSelf: 'flex-end', marginTop: 18, alignItems: 'flex-start' },
    moreText: { fontSize: 10, fontWeight: '600', color: P.muted, letterSpacing: 2.5, lineHeight: 16 },
    moreLine: { width: 22, height: 2, backgroundColor: P.muted, marginTop: 8, opacity: 0.7 },
  });
}
