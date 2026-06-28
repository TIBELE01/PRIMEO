// Two-factor auth — TOTP code entry, wired to auth API
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { secureStore as SecureStore } from '../../services/secureStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, type Theme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api/endpoints/auth';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import type { AuthScreenProps } from '../../navigation/types';

type Props = AuthScreenProps<'TwoFactor'>;
const TOTP_LEN = 6;

export function TwoFactorScreen({ route, navigation }: Props) {
  const { userId } = route.params ?? ({} as Partial<Props['route']['params']>);
  const { theme } = useTheme();
  const setUser   = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);
  const s = makeStyles(theme);

  const [digits,  setDigits]  = useState<string[]>(Array(TOTP_LEN).fill(''));
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const inputs = useRef<Array<TextInput | null>>(Array(TOTP_LEN).fill(null));
  const code = digits.join('');

  const handleDigit = (value: string, i: number) => {
    const d = value.replace(/[^0-9]/g, '').slice(-1);
    setDigits((prev) => { const n = [...prev]; n[i] = d; return n; });
    if (d && i < TOTP_LEN - 1) inputs.current[i + 1]?.focus();
  };

  const handleKeyPress = (key: string, i: number) => {
    if (key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handleVerify = async () => {
    if (code.length < TOTP_LEN) return;
    setError(null);
    setLoading(true);
    try {
      const { data } = await authApi.verifyTotp(userId, code);
      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN,  data.accessToken as string);
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken as string);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(data.user));
      setTokens(data.accessToken as string, data.refreshToken as string);
      setUser(data.user);
    } catch {
      setError('Code invalide ou expiré.');
      setDigits(Array(TOTP_LEN).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>Double authentification</Text>
          <Text style={s.subtitle}>
            Saisissez le code à 6 chiffres de votre application d'authentification.
          </Text>
        </View>

        <View style={s.otpRow}>
          {Array.from({ length: TOTP_LEN }).map((_, i) => (
            <TextInput
              key={i}
              ref={(r) => { inputs.current[i] = r; }}
              style={[s.otpBox, digits[i] ? s.otpBoxFilled : null]}
              maxLength={1}
              keyboardType="number-pad"
              value={digits[i]}
              onChangeText={(v) => handleDigit(v, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              accessibilityLabel={`Chiffre ${i + 1} du code 2FA`}
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
          style={[s.verifyBtn, (loading || code.length < TOTP_LEN) && s.btnDisabled]}
          onPress={handleVerify}
          disabled={loading || code.length < TOTP_LEN}
          accessibilityRole="button"
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.verifyBtnText}>Vérifier</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} accessibilityRole="link">
          <Text style={s.backLink}>Retour à la connexion</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    safe:         { flex: 1, paddingTop: 16, backgroundColor: t.colors.background },
    container:    { flex: 1, paddingHorizontal: 24, paddingTop: 48, alignItems: 'center', gap: 24 },
    header:       { alignItems: 'center', gap: 8 },
    title:        { fontSize: 22, fontWeight: '800', color: t.colors.text, textAlign: 'center' },
    subtitle:     { fontSize: 15, color: t.colors.textSecondary, textAlign: 'center', lineHeight: 22 },
    otpRow:       { flexDirection: 'row', gap: 10 },
    otpBox:       { width: 46, height: 54, borderWidth: 1.5, borderColor: t.colors.border, borderRadius: 12, fontSize: 22, fontWeight: '700', color: t.colors.text, backgroundColor: t.colors.surface },
    otpBoxFilled: { borderColor: t.colors.primary, backgroundColor: t.colors.primaryLight },
    errorBox:     { backgroundColor: t.colors.errorLight, borderRadius: 10, padding: 12, width: '100%' },
    errorText:    { color: t.colors.error, fontSize: 14, textAlign: 'center' },
    verifyBtn:    { backgroundColor: t.colors.primary, paddingVertical: 16, borderRadius: 14, alignItems: 'center', width: '100%' },
    btnDisabled:  { opacity: 0.5 },
    verifyBtnText:{ color: '#FFF', fontSize: 16, fontWeight: '700' },
    backLink:     { color: t.colors.primary, fontSize: 14, fontWeight: '600' },
  });
}
