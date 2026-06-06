// TwoFactorSetupScreen — configuration de l'authentification à deux facteurs (TOTP)
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../../navigation/types';
import { usersApi } from '../../../services/api/endpoints/users';
import { useAuthStore } from '../../../store/authStore';

// ── Types ─────────────────────────────────────────────────────────────────────

type Nav = NativeStackNavigationProp<ClientStackParamList>;

// ── Écran ─────────────────────────────────────────────────────────────────────

export default function TwoFactorSetupScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  // Données retournées par l'API de setup
  const [qrCodeUri, setQrCodeUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  // Code TOTP saisi par l'utilisateur pour confirmer
  const [totpCode, setTotpCode] = useState('');

  const [phase, setPhase] = useState<'idle' | 'setup' | 'confirm'>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const enabled = user?.twoFactorEnabled ?? false;

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Démarre le setup 2FA : récupère le QR code et le secret */
  const handleSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await usersApi.setup2fa();
      const data = res.data?.data ?? res.data;
      setQrCodeUri(data?.qrCode ?? data?.qrCodeUrl ?? null);
      setSecret(data?.secret ?? null);
      setPhase('setup');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; message?: string } } };
      setError(err.response?.data?.error ?? err.response?.data?.message ?? 'Impossible de démarrer la configuration 2FA.');
    } finally {
      setLoading(false);
    }
  };

  /** Confirme le code TOTP et active le 2FA */
  const handleConfirm = async () => {
    if (totpCode.length !== 6) {
      setError('Saisissez le code à 6 chiffres de votre application.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await usersApi.confirm2fa(totpCode);
      // Mise à jour du store : 2FA maintenant activé
      if (user) setUser({ ...user, twoFactorEnabled: true });
      Alert.alert(
        '2FA activé ✅',
        'L\'authentification à deux facteurs est maintenant active sur votre compte.',
        [{ text: 'Parfait', onPress: () => navigation.goBack() }],
      );
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; message?: string } } };
      setError(err.response?.data?.error ?? err.response?.data?.message ?? 'Code invalide. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  /** Désactive le 2FA */
  const handleDisable = () => {
    Alert.alert(
      'Désactiver la 2FA',
      'Êtes-vous sûr de vouloir désactiver l\'authentification à deux facteurs ? Votre compte sera moins sécurisé.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Désactiver',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            setError('');
            try {
              await usersApi.disable2fa();
              if (user) setUser({ ...user, twoFactorEnabled: false });
              Alert.alert('2FA désactivé', 'L\'authentification à deux facteurs a été désactivée.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (e: unknown) {
              const err = e as { response?: { data?: { error?: string; message?: string } } };
              setError(err.response?.data?.error ?? err.response?.data?.message ?? 'Impossible de désactiver le 2FA.');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F6FB" />

      {/* En-tête */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Authentification 2FA</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Statut actuel */}
        <View style={[styles.statusCard, enabled ? styles.statusActive : styles.statusInactive]}>
          <Text style={styles.statusIcon}>{enabled ? '🔐' : '🔓'}</Text>
          <View style={styles.statusContent}>
            <Text style={[styles.statusTitle, enabled ? styles.textSuccess : styles.textNeutral]}>
              {enabled ? '2FA activé' : '2FA désactivé'}
            </Text>
            <Text style={styles.statusSub}>
              {enabled
                ? 'Votre compte bénéficie d\'une protection renforcée.'
                : 'Ajoutez une couche de sécurité supplémentaire à votre compte.'}
            </Text>
          </View>
        </View>

        {/* 2FA désactivé → possibilité d'activer */}
        {!enabled && phase === 'idle' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Pourquoi activer la 2FA ?</Text>
            <View style={styles.benefitRow}>
              <Text style={styles.benefitIcon}>🛡️</Text>
              <Text style={styles.benefitText}>Protection contre les accès non autorisés même si votre mot de passe est compromis.</Text>
            </View>
            <View style={styles.benefitRow}>
              <Text style={styles.benefitIcon}>📱</Text>
              <Text style={styles.benefitText}>Utilise une application d'authentification : Google Authenticator, Authy, Microsoft Authenticator…</Text>
            </View>
            <View style={styles.benefitRow}>
              <Text style={styles.benefitIcon}>⚡</Text>
              <Text style={styles.benefitText}>Configuration rapide en moins de 2 minutes.</Text>
            </View>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity style={styles.primaryBtn} onPress={handleSetup} disabled={loading} activeOpacity={0.8}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>Activer la 2FA</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Phase setup : affichage du QR code et du secret */}
        {!enabled && phase === 'setup' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Étape 1 — Scanner le QR code</Text>
            <Text style={styles.setupInstructions}>
              Ouvrez votre application d'authentification et scannez ce QR code. Si vous ne pouvez pas le scanner, saisissez le code manuel ci-dessous.
            </Text>

            {/* QR Code */}
            {qrCodeUri ? (
              <Image source={{ uri: qrCodeUri }} style={styles.qrImage} resizeMode="contain" />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Text style={styles.qrPlaceholderText}>QR Code indisponible</Text>
              </View>
            )}

            {/* Code secret manuel */}
            {secret && (
              <View style={styles.secretBox}>
                <Text style={styles.secretLabel}>Code manuel</Text>
                <TouchableOpacity
                  onPress={() => Alert.alert('Code copié', 'Collez ce code dans votre application.')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secretCode}>{secret}</Text>
                  <Text style={styles.secretHint}>Appuyez pour copier</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.sectionTitle}>Étape 2 — Saisir le code de vérification</Text>
            <Text style={styles.setupInstructions}>
              Votre application va générer un code à 6 chiffres. Saisissez-le ici pour confirmer l'activation.
            </Text>

            <TextInput
              style={styles.otpInput}
              value={totpCode}
              onChangeText={(v) => { setTotpCode(v.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              placeholder="000000"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
            />

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.primaryBtn, totpCode.length < 6 && styles.primaryBtnDisabled]}
              onPress={handleConfirm}
              disabled={loading || totpCode.length < 6}
              activeOpacity={0.8}
            >
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>Confirmer et activer</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setPhase('idle'); setQrCodeUri(null); setSecret(null); setTotpCode(''); }}>
              <Text style={styles.secondaryBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 2FA activé → possibilité de désactiver */}
        {enabled && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Votre compte est protégé</Text>
            <View style={styles.benefitRow}>
              <Text style={styles.benefitIcon}>✅</Text>
              <Text style={styles.benefitText}>La vérification en deux étapes est active. Un code vous sera demandé à chaque connexion.</Text>
            </View>
            <View style={styles.benefitRow}>
              <Text style={styles.benefitIcon}>📱</Text>
              <Text style={styles.benefitText}>Gardez votre application d'authentification accessible pour vous connecter.</Text>
            </View>

            <TouchableOpacity
              style={styles.helpLink}
              onPress={() => Linking.openURL('https://support.google.com/accounts/answer/1066447').catch(() => null)}
            >
              <Text style={styles.helpLinkText}>Aide — Application d'authentification →</Text>
            </TouchableOpacity>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            {loading ? (
              <ActivityIndicator color="#EF4444" style={{ marginTop: 20 }} />
            ) : (
              <TouchableOpacity style={styles.dangerBtn} onPress={handleDisable} activeOpacity={0.8}>
                <Text style={styles.dangerBtnText}>Désactiver la 2FA</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F6FB' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: { minWidth: 64 },
  backText: { color: '#1056E0', fontSize: 15, fontWeight: '600' },
  topTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
  scroll: { padding: 16, paddingBottom: 48 },

  // Statut
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    gap: 14,
  },
  statusActive: { backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: '#BBF7D0' },
  statusInactive: { backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB' },
  statusIcon: { fontSize: 32 },
  statusContent: { flex: 1 },
  statusTitle: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  statusSub: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  textSuccess: { color: '#16A34A' },
  textNeutral: { color: '#374151' },

  // Carte
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 14,
    paddingBottom: 20,
    paddingTop: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Avantages
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingBottom: 10, gap: 12 },
  benefitIcon: { fontSize: 20, marginTop: 1 },
  benefitText: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 },

  // Instructions de setup
  setupInstructions: { fontSize: 14, color: '#374151', lineHeight: 20, paddingHorizontal: 16, paddingBottom: 14 },

  // QR code
  qrImage: { width: 200, height: 200, alignSelf: 'center', marginBottom: 16, borderRadius: 12 },
  qrPlaceholder: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginBottom: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholderText: { color: '#9CA3AF', fontSize: 13 },

  // Code secret
  secretBox: {
    backgroundColor: '#F8FAFF',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  secretLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  secretCode: { fontFamily: 'monospace', fontSize: 16, color: '#1056E0', fontWeight: '700', letterSpacing: 2, textAlign: 'center' },
  secretHint: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },

  // OTP input
  otpInput: {
    borderWidth: 2,
    borderColor: '#1056E0',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 28,
    letterSpacing: 10,
    color: '#1056E0',
    fontWeight: '800',
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#F8FAFF',
  },

  // Lien aide
  helpLink: { paddingHorizontal: 16, paddingBottom: 16 },
  helpLinkText: { color: '#1056E0', fontSize: 14, fontWeight: '600' },

  // Erreur
  errorText: { color: '#EF4444', fontSize: 13, fontWeight: '500', paddingHorizontal: 16, marginBottom: 12 },

  // Boutons
  primaryBtn: {
    backgroundColor: '#1056E0',
    borderRadius: 12,
    paddingVertical: 15,
    marginHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    marginBottom: 12,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 13,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#374151', fontWeight: '700', fontSize: 15 },
  dangerBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 14,
    marginHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  dangerBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
});
