import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView,
  ActivityIndicator, Linking,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, type Theme } from '../../../theme/ThemeProvider';
import { normalizeIvorianPhone } from '../auth.utils';
import { authApi } from '../../../services/api/endpoints/auth';
import { submitKyc as submitKycDocuments } from '../../../services/kycUpload';
import { useAuthStore } from '../../../store/authStore';
import { STORAGE_KEYS } from '../../../constants/storageKeys';
import type { AuthScreenProps } from '../../../navigation/types';
import type { RegistrationData } from './index';

type Props = {
  data: RegistrationData;
  onUpdate?: (patch: Partial<RegistrationData>) => void;
  onNext?: () => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
  navigation: AuthScreenProps<'Register'>['navigation'];
};

const ACCOUNT_LABELS: Record<string, string> = {
  client:                    'Client',
  professional_hebergement:  'Professionnel — Résidence / Appartement',
  professional_hotel:        'Professionnel — Hôtel',
  professional_immobilier:   'Professionnel — Immobilier',
  restaurateur:              'Restaurateur',
};

export function Step5Validation({ data, onBack, currentStep, totalSteps, navigation }: Props) {
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const setUser   = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const isPro = data.accountType !== null && data.accountType !== 'client';
  const normalizedPhone = normalizeIvorianPhone(data.phone) ?? data.phone;

  const handleSubmit = async () => {
    if (!accepted) return;
    setError(null);
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        firstName:   data.firstName.trim(),
        lastName:    data.lastName.trim(),
        email:       data.email.trim().toLowerCase(),
        phone:       normalizedPhone,
        password:    data.password,
        accountType: data.accountType,
      };
      if (isPro) {
        payload.businessName    = data.businessName.trim();
        payload.businessAddress = data.businessAddress.trim();
        payload.rccm            = data.rccm.trim();
        payload.taxNumber       = data.taxNumber.trim();
      }
      if (data.referralCode?.trim()) {
        payload.referralCode = data.referralCode.trim();
      }
      const registerRes = await authApi.register(payload);
      const resData = registerRes.data as {
        message?: string;
        accessToken?: string;
        refreshToken?: string;
        user?: Parameters<typeof setUser>[0];
      };

      // Bypass mode: backend returned tokens directly → log in immediately, skip OTP
      if (resData.accessToken && resData.refreshToken && resData.user) {
        await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN,  resData.accessToken);
        await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, resData.refreshToken);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(resData.user));
        setTokens(resData.accessToken, resData.refreshToken);

        // Upload des documents KYC une fois authentifié (best-effort — non bloquant)
        if (isPro && data.kycDocuments.length > 0) {
          try {
            await submitKycDocuments(
              {
                businessName: data.businessName.trim(),
                rccm: data.rccm.trim() || undefined,
                taxId: data.taxNumber.trim() || undefined,
                street: data.businessAddress.trim() || undefined,
              },
              data.kycDocuments,
            );
          } catch {
            // En cas d'échec, le pro pourra re-soumettre depuis l'écran Statut KYC
          }
        }

        setUser(resData.user);
        return;
      }

      // Normal mode: navigate to OTP verification.
      // Les documents KYC sont transmis pour upload après vérification OTP.
      navigation.navigate('OtpVerification', {
        phone: normalizedPhone,
        context: 'registration',
        kycDocuments: isPro && data.kycDocuments.length > 0 ? data.kycDocuments : undefined,
        kycBusinessInfo: isPro ? {
          businessName: data.businessName.trim(),
          rccm: data.rccm.trim() || undefined,
          taxId: data.taxNumber.trim() || undefined,
          street: data.businessAddress.trim() || undefined,
        } : undefined,
      });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; message?: string }; status?: number }; message?: string };
      const serverMsg = axiosErr?.response?.data?.error ?? axiosErr?.response?.data?.message;
      const networkMsg = !axiosErr?.response
        ? `Impossible de joindre le serveur${axiosErr?.message ? ` (${axiosErr.message})` : ''}`
        : null;
      setError(serverMsg ?? networkMsg ?? 'Erreur lors de la création du compte. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${(currentStep / totalSteps) * 100}%` }]} />
      </View>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.stepLabel}>Étape {currentStep}/{totalSteps}</Text>
          <Text style={s.title}>Récapitulatif</Text>
          <Text style={s.subtitle}>Vérifiez vos informations avant de créer votre compte.</Text>
        </View>

        {error && (
          <View style={s.errorBox} accessibilityLiveRegion="polite">
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <View style={s.summary}>
          <SummaryRow label="Type de compte" value={ACCOUNT_LABELS[data.accountType ?? ''] ?? ''} theme={theme} />
          <SummaryRow label="Prénom"          value={data.firstName}    theme={theme} />
          <SummaryRow label="Nom"             value={data.lastName}     theme={theme} />
          <SummaryRow label="E-mail"          value={data.email}        theme={theme} />
          <SummaryRow label="Téléphone"       value={normalizedPhone}   theme={theme} last={!isPro && !data.referralCode?.trim()} />
          {data.referralCode?.trim() && !isPro && (
            <SummaryRow label="Code parrain" value={data.referralCode.trim()} theme={theme} last />
          )}
          {isPro && (
            <>
              <SummaryRow label="Établissement" value={data.businessName}    theme={theme} />
              <SummaryRow label="Adresse"       value={data.businessAddress} theme={theme} />
              <SummaryRow label="RCCM"          value={data.rccm}            theme={theme} />
              <SummaryRow label="Contribuable"  value={data.taxNumber}       theme={theme} />
              {data.kycDocuments.length > 0 && (
                <SummaryRow
                  label="Documents"
                  value={`${data.kycDocuments.length} fichier${data.kycDocuments.length > 1 ? 's' : ''} joint${data.kycDocuments.length > 1 ? 's' : ''}`}
                  theme={theme}
                  last={!data.referralCode?.trim()}
                />
              )}
              {data.referralCode?.trim() && (
                <SummaryRow label="Code parrain" value={data.referralCode.trim()} theme={theme} last />
              )}
            </>
          )}
        </View>

        {/* CGU checkbox */}
        <TouchableOpacity
          style={s.cguRow}
          onPress={() => setAccepted((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
        >
          <View style={[s.checkbox, accepted && s.checkboxChecked]}>
            {accepted && <Text style={s.checkmark}>✓</Text>}
          </View>
          <Text style={s.cguText}>
            J'accepte les{' '}
            <Text
              style={s.cguLink}
              onPress={() => Linking.openURL('https://primeo-vitrine.onrender.com/legal/cgu.html')}
              accessibilityRole="link"
            >
              Conditions Générales d'Utilisation
            </Text>
            {' '}et la{' '}
            <Text
              style={s.cguLink}
              onPress={() => Linking.openURL('https://primeo-vitrine.onrender.com/legal/confidentialite.html')}
              accessibilityRole="link"
            >
              Politique de Confidentialité
            </Text>
          </Text>
        </TouchableOpacity>

        <View style={s.actions}>
          <TouchableOpacity
            style={[s.submitBtn, (!accepted || loading) && s.btnDisabled]}
            onPress={handleSubmit}
            disabled={!accepted || loading}
            accessibilityRole="button"
          >
            {loading
              ? <ActivityIndicator color="#FFF" />
              : <Text style={s.submitBtnText}>Créer mon compte</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity onPress={onBack} accessibilityRole="button">
            <Text style={s.backLink}>Retour</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({
  label, value, theme, last = false,
}: {
  label: string; value: string; theme: ReturnType<typeof useTheme>['theme']; last?: boolean;
}) {
  return (
    <View style={[
      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
      !last && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    ]}>
      <Text style={{ fontSize: 13, color: theme.colors.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 13, color: theme.colors.text, fontWeight: '600', maxWidth: '60%', textAlign: 'right' }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    safe:           { flex: 1, backgroundColor: t.colors.background },
    progressTrack:  { height: 4, backgroundColor: t.colors.border },
    progressFill:   { height: '100%', backgroundColor: t.colors.primary, borderRadius: 2 },
    scroll:         { flexGrow: 1, padding: 24, gap: 20, paddingBottom: 40 },
    header:         { gap: 6 },
    stepLabel:      { fontSize: 12, color: t.colors.textDisabled, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    title:          { fontSize: 24, fontWeight: '800', color: t.colors.text },
    subtitle:       { fontSize: 15, color: t.colors.textSecondary, lineHeight: 22 },
    errorBox:       { backgroundColor: t.colors.errorLight, borderRadius: 10, padding: 12 },
    errorText:      { color: t.colors.error, fontSize: 14 },
    summary:        { backgroundColor: t.colors.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 4 },
    cguRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    checkbox:       { width: 22, height: 22, borderWidth: 2, borderColor: t.colors.border, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    checkboxChecked:{ backgroundColor: t.colors.primary, borderColor: t.colors.primary },
    checkmark:      { color: '#FFF', fontSize: 13, fontWeight: '800' },
    cguText:        { flex: 1, fontSize: 13, color: t.colors.textSecondary, lineHeight: 20 },
    cguLink:        { color: t.colors.primary, fontWeight: '700' },
    actions:        { gap: 12 },
    submitBtn:      { backgroundColor: t.colors.primary, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
    btnDisabled:    { opacity: 0.4 },
    submitBtnText:  { color: '#FFF', fontSize: 16, fontWeight: '700' },
    backLink:       { textAlign: 'center', color: t.colors.textSecondary, fontSize: 14, fontWeight: '600' },
  });
}
