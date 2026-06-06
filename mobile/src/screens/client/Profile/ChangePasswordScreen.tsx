// ChangePasswordScreen — formulaire de changement de mot de passe
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../../navigation/types';
import { usersApi } from '../../../services/api/endpoints/users';

// ── Types ─────────────────────────────────────────────────────────────────────

type Nav = NativeStackNavigationProp<ClientStackParamList>;

// ── Sous-composant : champ mot de passe ──────────────────────────────────────

function PasswordField({
  label,
  value,
  onChangeText,
  visible,
  onToggleVisible,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  placeholder?: string;
  error?: string;
}) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputRow, !!error && styles.inputRowError]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? label}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.eyeBtn} onPress={onToggleVisible} activeOpacity={0.7}>
          <Text style={styles.eyeIcon}>{visible ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

// ── Écran ─────────────────────────────────────────────────────────────────────

export default function ChangePasswordScreen() {
  const navigation = useNavigation<Nav>();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Visibilité des mots de passe
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Erreurs de validation inline
  const [errorCurrent, setErrorCurrent] = useState('');
  const [errorNew, setErrorNew] = useState('');
  const [errorConfirm, setErrorConfirm] = useState('');
  const [globalError, setGlobalError] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    let valid = true;
    setErrorCurrent('');
    setErrorNew('');
    setErrorConfirm('');
    setGlobalError('');

    if (!currentPassword) {
      setErrorCurrent('Le mot de passe actuel est requis.');
      valid = false;
    }
    if (!newPassword || newPassword.length < 8) {
      setErrorNew('Le nouveau mot de passe doit comporter au moins 8 caractères.');
      valid = false;
    }
    if (newPassword !== confirmPassword) {
      setErrorConfirm('Les mots de passe ne correspondent pas.');
      valid = false;
    }
    return valid;
  };

  // ── Soumission ────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await usersApi.changePassword({ currentPassword, newPassword });
      setSuccess(true);
      Alert.alert(
        'Mot de passe modifié',
        'Votre mot de passe a été mis à jour avec succès.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { error?: string; message?: string } } };
      // Mot de passe actuel incorrect (401 ou message explicite)
      if (err.response?.status === 401 || err.response?.data?.error?.toLowerCase().includes('incorrect') || err.response?.data?.message?.toLowerCase().includes('incorrect')) {
        setErrorCurrent('Mot de passe actuel incorrect.');
        setGlobalError('Le mot de passe actuel saisi est incorrect. Veuillez réessayer.');
      } else {
        setGlobalError(err.response?.data?.error ?? err.response?.data?.message ?? 'Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
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
        <Text style={styles.topTitle}>Changer le mot de passe</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Icône + description */}
        <View style={styles.introBox}>
          <Text style={styles.introIcon}>🔑</Text>
          <Text style={styles.introTitle}>Sécurisez votre compte</Text>
          <Text style={styles.introText}>
            Choisissez un mot de passe robuste d'au moins 8 caractères, idéalement avec des chiffres et des symboles.
          </Text>
        </View>

        {/* Formulaire */}
        <View style={styles.card}>
          <PasswordField
            label="Mot de passe actuel"
            value={currentPassword}
            onChangeText={(v) => { setCurrentPassword(v); setErrorCurrent(''); setGlobalError(''); }}
            visible={showCurrent}
            onToggleVisible={() => setShowCurrent((p) => !p)}
            error={errorCurrent}
          />
          <PasswordField
            label="Nouveau mot de passe"
            value={newPassword}
            onChangeText={(v) => { setNewPassword(v); setErrorNew(''); }}
            visible={showNew}
            onToggleVisible={() => setShowNew((p) => !p)}
            placeholder="Minimum 8 caractères"
            error={errorNew}
          />
          <PasswordField
            label="Confirmer le nouveau mot de passe"
            value={confirmPassword}
            onChangeText={(v) => { setConfirmPassword(v); setErrorConfirm(''); }}
            visible={showConfirm}
            onToggleVisible={() => setShowConfirm((p) => !p)}
            error={errorConfirm}
          />

          {/* Indicateur de force (simple) */}
          {newPassword.length > 0 && (
            <View style={styles.strengthWrapper}>
              <View style={styles.strengthBar}>
                <View
                  style={[
                    styles.strengthFill,
                    {
                      width: `${Math.min(100, newPassword.length * 8)}%` as `${number}%`,
                      backgroundColor: newPassword.length < 8 ? '#EF4444' : newPassword.length < 12 ? '#F59E0B' : '#16A34A',
                    },
                  ]}
                />
              </View>
              <Text style={[
                styles.strengthLabel,
                { color: newPassword.length < 8 ? '#EF4444' : newPassword.length < 12 ? '#F59E0B' : '#16A34A' },
              ]}>
                {newPassword.length < 8 ? 'Trop court' : newPassword.length < 12 ? 'Acceptable' : 'Robuste'}
              </Text>
            </View>
          )}
        </View>

        {/* Erreur globale */}
        {!!globalError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠️  {globalError}</Text>
          </View>
        )}

        {/* Succès */}
        {success && (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>✅  Mot de passe mis à jour avec succès !</Text>
          </View>
        )}

        {/* Bouton principal */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitText}>Modifier le mot de passe</Text>
          )}
        </TouchableOpacity>

        {/* Bouton annuler */}
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.cancelText}>Annuler</Text>
        </TouchableOpacity>
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

  // Intro
  introBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  introIcon: { fontSize: 36, marginBottom: 10 },
  introTitle: { fontSize: 17, fontWeight: '800', color: '#1056E0', marginBottom: 6 },
  introText: { fontSize: 14, color: '#3B82F6', textAlign: 'center', lineHeight: 20 },

  // Carte formulaire
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    paddingBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
  },

  // Champ
  fieldWrapper: { paddingHorizontal: 16, paddingTop: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
  },
  inputRowError: { borderColor: '#EF4444' },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  eyeIcon: { fontSize: 18 },
  fieldError: { color: '#EF4444', fontSize: 12, marginTop: 4, fontWeight: '500' },

  // Force du mot de passe
  strengthWrapper: { paddingHorizontal: 16, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  strengthBar: { flex: 1, height: 5, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 4 },
  strengthLabel: { fontSize: 12, fontWeight: '700', minWidth: 70, textAlign: 'right' },

  // Bandeaux
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 14,
  },
  errorBannerText: { color: '#DC2626', fontSize: 14, fontWeight: '500' },
  successBanner: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 14,
  },
  successBannerText: { color: '#16A34A', fontSize: 14, fontWeight: '500' },

  // Boutons
  submitBtn: {
    backgroundColor: '#1056E0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginBottom: 12,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelBtn: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  cancelText: { color: '#374151', fontWeight: '700', fontSize: 15 },
});
