// TwoFactorSetupScreen: TOTP 2FA setup for clients (optional)
import React, { useState, useEffect } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { authApi } from '../../../services/api/endpoints/auth';

export default function TwoFactorSetupScreen() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await authApi.setup2fa();
      setQrCode(res.data.data.qrCode);
      setSecret(res.data.data.secret);
    })();
  }, []);

  const handleVerify = async () => {
    setLoading(true);
    try {
      await authApi.verify2fa({ token: code });
      Alert.alert('Succès', '2FA activé avec succès');
    } catch {
      Alert.alert('Erreur', 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.content}>
        <Text style={styles.title}>Configuration 2FA</Text>
        <Text style={styles.desc}>Scannez ce QR code avec votre application d'authentification (Google Authenticator, Authy...)</Text>
        {qrCode ? <Image source={{ uri: qrCode }} style={styles.qr} /> : <ActivityIndicator color="#1056E0" />}
        {secret ? <Text style={styles.secret}>Clé manuelle: {secret}</Text> : null}
        <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="Code à 6 chiffres" keyboardType="number-pad" maxLength={6} textAlign="center" />
        <TouchableOpacity style={styles.btn} onPress={handleVerify} disabled={loading || code.length < 6}>
          <Text style={styles.btnText}>{loading ? 'Vérification...' : 'Vérifier et activer'}</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#1056E0', marginBottom: 12 },
  desc: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  qr: { width: 220, height: 220, marginBottom: 20 },
  secret: { fontSize: 12, color: '#999', marginBottom: 24, fontFamily: 'monospace' },
  input: { borderWidth: 1.5, borderColor: '#1056E0', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, fontSize: 24, letterSpacing: 6, width: 200, marginBottom: 20 },
  btn: { backgroundColor: '#1056E0', borderRadius: 10, paddingHorizontal: 40, paddingVertical: 14 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
