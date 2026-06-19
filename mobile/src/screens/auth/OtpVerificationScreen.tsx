// OTP verification — 6-digit entry, 60 s resend cooldown, wired to auth API
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, type Theme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api/endpoints/auth';
import { submitKyc as submitKycDocuments } from '../../services/kycUpload';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import type { AuthScreenProps } from '../../navigation/types';

type Props = AuthScreenProps<'OtpVerification'>;
const OTP_LEN      = 6;
const RESEND_DELAY = 60;

export function OtpVerificationScreen({ route, navigation }: Props) {
  const { phone, context, bypassCode, kycDocuments, kycBusinessInfo } =
    route.params ?? ({} as Partial<Props['route']['params']>);
  const { theme } = useTheme();
  const setUser   = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);
  const s = makeStyles(theme);

  const [digits,   setDigits]   = useState<string[]>(
    bypassCode ? bypassCode.split('') : Array(OTP_LEN).fill('')
  );
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_DELAY);
  const inputs = useRef<Array<TextInput | null>>(Array(OTP_LEN).fill(null));
  const code = digits.join('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const handleDigit = useCallback((value: string, i: number) => {
    const d = value.replace(/[^0-9]/g, '').slice(-1);
    setDigits((prev) => { const n = [...prev]; n[i] = d; return n; });
    if (d && i < OTP_LEN - 1) inputs.current[i + 1]?.focus();
  }, []);

  const handleKeyPress = useCallback((key: string, i: number) => {
    if (key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  }, [digits]);

  const handleVerify = async () => {
    if (code.length < OTP_LEN) return;
    setError(null);
    setLoading(true);
    try {
      const { data } = await authApi.verifyPhone(phone, code);
      if (context === 'registration') {
        await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN,  data.accessToken as string);
        await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken as string);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(data.user));
        setTokens(data.accessToken as string, data.refreshToken as string);

        // Upload des documents KYC une fois authentifié (best-effort — non bloquant)
        if (kycDocuments && kycDocuments.length > 0 && kycBusinessInfo) {
          try {
            await submitKycDocuments(kycBusinessInfo, kycDocuments);
          } catch {
            // En cas d'échec, le pro pourra re-soumettre depuis l'écran Statut KYC
          }
        }

        setUser(data.user);
      } else {
        navigation.navigate('ResetPassword', { recoveryToken: code });
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } } };
      setError(e?.response?.data?.error ?? e?.response?.data?.message ?? 'Code invalide ou expiré. Vérifiez et réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      await authApi.resendOtp(phone);
      setCooldown(RESEND_DELAY);
      setDigits(Array(OTP_LEN).fill(''));
      inputs.current[0]?.focus();
    } catch {
      setError('Impossible de renvoyer le code. Réessayez plus tard.');
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>Vérification</Text>
          {bypassCode ? (
            <Text style={[s.subtitle, { color: theme.colors.primary, fontWeight: '700' }]}>
              Mode test — code pré-rempli : <Text style={{ letterSpacing: 4 }}>{bypassCode}</Text>{'\n'}
              <Text style={{ fontWeight: '400', fontSize: 13 }}>Appuyez sur Vérifier pour continuer.</Text>
            </Text>
          ) : (
            <Text style={s.subtitle}>
              Code SMS envoyé au{'\n'}<Text style={s.phoneText}>{phone}</Text>
            </Text>
          )}
        </View>

        <View style={s.otpRow}>
          {Array.from({ length: OTP_LEN }).map((_, i) => (
            <TextInput
              key={i}
              ref={(r) => { inputs.current[i] = r; }}
              style={[s.otpBox, digits[i] ? s.otpBoxFilled : null]}
              maxLength={1}
              keyboardType="number-pad"
              value={digits[i]}
              onChangeText={(v) => handleDigit(v, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              accessibilityLabel={`Chiffre ${i + 1} sur ${OTP_LEN}`}
              textAlign="center"
            />
          ))}
        </View>

        {error && (
          <View style={s.errorBox} accessibilityLiveRegion="polite">
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[s.verifyBtn, (loading || code.length < OTP_LEN) && s.btnDisabled]}
          onPress={handleVerify}
          disabled={loading || code.length < OTP_LEN}
          accessibilityRole="button"
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.verifyBtnText}>Vérifier</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleResend}
          disabled={cooldown > 0}
          accessibilityRole="button"
          accessibilityLabel={cooldown > 0 ? `Renvoi dans ${cooldown} s` : 'Renvoyer le code'}
        >
          <Text style={[s.resendText, cooldown > 0 && s.resendDisabled]}>
            {cooldown > 0
              ? `Renvoyer dans ${cooldown} s`
              : <Text style={s.resendLink}>Renvoyer le code</Text>
            }
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    safe:         { flex: 1, paddingTop: 16, backgroundColor: t.colors.background },
    container:    { flex: 1, paddingHorizontal: 24, paddingTop: 40, alignItems: 'center', gap: 24 },
    header:       { alignItems: 'center', gap: 8 },
    title:        { fontSize: 26, fontWeight: '800', color: t.colors.text },
    subtitle:     { fontSize: 15, color: t.colors.textSecondary, textAlign: 'center', lineHeight: 22 },
    phoneText:    { fontWeight: '700', color: t.colors.text },
    otpRow:       { flexDirection: 'row', gap: 10 },
    otpBox:       { width: 46, height: 54, borderWidth: 1.5, borderColor: t.colors.border, borderRadius: 12, fontSize: 22, fontWeight: '700', color: t.colors.text, backgroundColor: t.colors.surface },
    otpBoxFilled: { borderColor: t.colors.primary, backgroundColor: t.colors.primaryLight },
    errorBox:     { backgroundColor: t.colors.errorLight, borderRadius: 10, padding: 12, width: '100%' },
    errorText:    { color: t.colors.error, fontSize: 14, textAlign: 'center' },
    verifyBtn:    { backgroundColor: t.colors.primary, paddingVertical: 16, borderRadius: 14, alignItems: 'center', width: '100%' },
    btnDisabled:  { opacity: 0.5 },
    verifyBtnText:{ color: '#FFF', fontSize: 16, fontWeight: '700' },
    resendText:   { color: t.colors.textSecondary, fontSize: 14 },
    resendDisabled: { opacity: 0.55 },
    resendLink:   { color: t.colors.primary, fontWeight: '700' },
  });
}
