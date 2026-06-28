// Login screen — design premium harmonisé avec WelcomeScreen : hero sombre de
// marque (logo + message d'accueil), carte de formulaire blanche arrondie, champs
// avec icônes, boutons aux couleurs Primeo. Logique inchangée (2FA, Google, session).
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView, Image, Dimensions, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api/endpoints/auth';
import { signInWithGoogle } from '../../services/googleAuth';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import type { AuthScreenProps } from '../../navigation/types';
import { trackEvent } from '../../services/analytics';
import { PRIMEO_LOGO_URL } from '../../components/common/Logo';

type Props = AuthScreenProps<'Login'>;

const { height } = Dimensions.get('window');
const BRAND_BLUE = '#1056E0';
const DARK = '#040C1F';

export function LoginScreen({ navigation }: Props) {
  const setUser   = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);

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
      <StatusBar barStyle="light-content" backgroundColor={DARK} />
      {/* Glows ambiants (mêmes que la page d'atterrissage) */}
      <View style={s.glowTop} />
      <View style={s.glowMid} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ── Hero de marque ── */}
          <SafeAreaView edges={['top']} style={s.heroArea}>
            <Image source={{ uri: PRIMEO_LOGO_URL }} resizeMode="contain" style={s.logo} />
            <Text style={s.welcome}>Bienvenue sur Primeo</Text>
            <Text style={s.welcomeSub}>La plateforme de confiance pour vos réservations</Text>
          </SafeAreaView>

          {/* ── Carte formulaire ── */}
          <View style={s.card}>
            <View style={s.cardHandle} />
            <Text style={s.cardTitle}>Connexion</Text>
            <Text style={s.cardSub}>Heureux de vous revoir 👋</Text>

            {error && (
              <View style={s.errorBox} accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle" size={18} color="#DC2626" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            <View style={s.field}>
              <Text style={s.label}>Adresse e-mail</Text>
              <View style={s.inputRow}>
                <Ionicons name="mail-outline" size={18} color="#9CA3AF" style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="vous@exemple.ci"
                  placeholderTextColor="#9CA3AF"
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

            <View style={s.field}>
              <Text style={s.label}>Mot de passe</Text>
              <View style={s.inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
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
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} accessibilityRole="link">
              <Text style={s.forgotLink}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.primaryBtn, (!canSubmit || loading) && s.btnDisabled]}
              onPress={handleLogin}
              disabled={!canSubmit || loading}
              accessibilityRole="button"
              accessibilityLabel="Se connecter"
              activeOpacity={0.88}
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={s.primaryBtnText}>Se connecter</Text>}
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
              activeOpacity={0.88}
            >
              {googleLoading
                ? <ActivityIndicator color="#0F1729" />
                : (
                  <>
                    <Text style={s.googleIcon}>G</Text>
                    <Text style={s.googleBtnText}>Continuer avec Google</Text>
                  </>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Register', { role: 'client' })} accessibilityRole="link" style={s.registerWrap}>
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
              activeOpacity={0.88}
            >
              <Ionicons name="briefcase-outline" size={17} color={BRAND_BLUE} />
              <Text style={s.proBtnText}>Inscription professionnelle</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK },
  scroll: { flexGrow: 1 },

  glowTop: { position: 'absolute', width: 380, height: 380, borderRadius: 190, top: -120, left: -60, backgroundColor: 'rgba(16,86,224,0.18)' },
  glowMid: { position: 'absolute', width: 260, height: 260, borderRadius: 130, top: height * 0.18, right: -80, backgroundColor: 'rgba(16,86,224,0.10)' },

  // ── Hero ──
  heroArea: { alignItems: 'center', paddingTop: 24, paddingBottom: 18 },
  logo: { width: 96, height: 96, marginBottom: 10, shadowColor: BRAND_BLUE, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.55, shadowRadius: 16, elevation: 10 },
  welcome: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.3 },
  welcomeSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4, textAlign: 'center', paddingHorizontal: 24 },

  // ── Carte ──
  card: {
    flex: 1, backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingTop: 14, paddingHorizontal: 24, paddingBottom: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 20,
  },
  cardHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 18 },
  cardTitle: { fontSize: 24, fontWeight: '900', color: '#0F1729', letterSpacing: -0.3 },
  cardSub: { fontSize: 14, color: '#64748B', marginTop: 4, marginBottom: 20 },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, padding: 12, marginBottom: 14 },
  errorText: { color: '#DC2626', fontSize: 13.5, flex: 1 },

  field: { marginBottom: 14 },
  label: { fontSize: 13.5, fontWeight: '700', color: '#374151', marginBottom: 7 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, backgroundColor: '#F9FAFB', paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#0F1729' },
  eyeBtn: { padding: 6 },
  forgotLink: { color: BRAND_BLUE, fontSize: 13.5, fontWeight: '600', textAlign: 'right', marginTop: 2, marginBottom: 18 },

  primaryBtn: {
    backgroundColor: BRAND_BLUE, paddingVertical: 17, borderRadius: 16, alignItems: 'center',
    shadowColor: BRAND_BLUE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  btnDisabled: { opacity: 0.5 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },

  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 16, paddingVertical: 15, backgroundColor: '#fff' },
  googleIcon: { fontSize: 18, fontWeight: '900', color: '#4285F4' },
  googleBtnText: { fontSize: 15, fontWeight: '700', color: '#0F1729' },

  registerWrap: { marginTop: 20, marginBottom: 4 },
  registerLink: { textAlign: 'center', color: '#64748B', fontSize: 14 },
  registerLinkBold: { color: BRAND_BLUE, fontWeight: '800' },

  proBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderColor: BRAND_BLUE, borderRadius: 16, paddingVertical: 14, marginTop: 14 },
  proBtnText: { fontSize: 15, fontWeight: '700', color: BRAND_BLUE },
});
