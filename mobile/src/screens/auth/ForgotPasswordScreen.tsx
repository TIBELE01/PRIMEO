// Forgot password — email → API call → success state
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useTheme, type Theme } from '../../theme/ThemeProvider';
import { authApi } from '../../services/api/endpoints/auth';
import type { AuthScreenProps } from '../../navigation/types';

type Props = AuthScreenProps<'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const s = makeStyles(theme);

  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleSend = async () => {
    if (!email.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } } };
      const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? 'Erreur lors de l\'envoi. Réessayez.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.container}>
          <View style={s.header}>
            <Text style={s.title}>Mot de passe oublié</Text>
            <Text style={s.subtitle}>
              {sent
                ? 'Vérifiez votre messagerie.'
                : 'Saisissez votre e-mail pour recevoir un lien de réinitialisation.'}
            </Text>
          </View>

          {sent ? (
            <View style={s.successBox}>
              <Text style={s.successText}>
                Un lien a été envoyé à{'\n'}
                <Text style={s.successEmail}>{email}</Text>
                {'\n\n'}
                Cliquez sur le lien dans l'e-mail pour choisir un nouveau mot de passe.
                Le lien est valable 2 heures.
              </Text>
            </View>
          ) : (
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
                  value={email}
                  onChangeText={setEmail}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                  accessibilityLabel="Adresse e-mail pour réinitialisation"
                />
              </View>
            </View>
          )}

          <View style={s.footer}>
            {!sent && (
              <TouchableOpacity
                style={[s.sendBtn, (!email.trim() || loading) && s.btnDisabled]}
                onPress={handleSend}
                disabled={!email.trim() || loading}
                accessibilityRole="button"
              >
                {loading
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={s.sendBtnText}>Envoyer le lien</Text>
                }
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => navigation.navigate('Login')} accessibilityRole="link">
              <Text style={s.backLink}>Retour à la connexion</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    safe:        { flex: 1, backgroundColor: t.colors.background },
    container:   { flex: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24, justifyContent: 'space-between', gap: 24 },
    header:      { gap: 8 },
    title:       { fontSize: 26, fontWeight: '800', color: t.colors.text },
    subtitle:    { fontSize: 15, color: t.colors.textSecondary, lineHeight: 22 },
    form:        { gap: 16 },
    field:       { gap: 6 },
    label:       { fontSize: 14, fontWeight: '600', color: t.colors.text },
    input:       { borderWidth: 1.5, borderColor: t.colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: t.colors.text, backgroundColor: t.colors.surface },
    errorBox:    { backgroundColor: t.colors.errorLight, borderRadius: 10, padding: 12 },
    errorText:   { color: t.colors.error, fontSize: 14 },
    successBox:  { backgroundColor: t.colors.successLight, borderRadius: 12, padding: 20 },
    successText: { color: t.colors.success, fontSize: 15, lineHeight: 24 },
    successEmail:{ fontWeight: '700' },
    footer:      { gap: 14 },
    sendBtn:     { backgroundColor: t.colors.primary, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
    btnDisabled: { opacity: 0.5 },
    sendBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    backLink:    { textAlign: 'center', color: t.colors.primary, fontSize: 14, fontWeight: '600' },
  });
}
