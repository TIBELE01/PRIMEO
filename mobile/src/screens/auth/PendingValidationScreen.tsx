import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';

const LABELS: Record<string, string> = {
  professional_hebergement: 'Résidence / Appartement',
  professional_hotel:        'Hôtel',
  professional_immobilier:   'Immobilier',
  restaurateur:              'Restaurateur',
};

export default function PendingValidationScreen() {
  const user   = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);

  const roleLabel      = LABELS[user?.role ?? ''] ?? 'Professionnel';
  const isRejected     = user?.kycStatus === 'rejected';
  const rejectionReason = user?.kycRejectionReason;

  if (isRejected) {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={[s.iconWrap, s.iconWrapError]}>
            <Text style={s.icon}>❌</Text>
          </View>

          <Text style={s.title}>Compte refusé</Text>
          <Text style={s.subtitle}>
            Votre demande de compte <Text style={s.bold}>{roleLabel}</Text> n'a pas été approuvée par notre équipe.
          </Text>

          {rejectionReason ? (
            <View style={[s.infoCard, s.errorCard]}>
              <Text style={s.infoTitle}>Motif du refus</Text>
              <Text style={s.infoItem}>{rejectionReason}</Text>
            </View>
          ) : null}

          <View style={s.infoCard}>
            <Text style={s.infoTitle}>Que faire maintenant ?</Text>
            <Text style={s.infoItem}>• Vérifiez que vos informations professionnelles sont exactes</Text>
            <Text style={s.infoItem}>• Contactez notre support pour plus d'informations</Text>
            <Text style={s.infoItem}>• Vous pouvez soumettre une nouvelle demande après correction</Text>
          </View>

          <View style={s.infoCard}>
            <Text style={s.infoTitle}>Besoin d'aide ?</Text>
            <Text style={s.infoItem}>📧  support@primeo.ci</Text>
            <Text style={s.infoItem}>📞  +225 07 00 00 00 00</Text>
          </View>

          <TouchableOpacity style={s.logoutBtn} onPress={logout} accessibilityRole="button">
            <Text style={s.logoutText}>Se déconnecter</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.iconWrap}>
          <Text style={s.icon}>⏳</Text>
        </View>

        <Text style={s.title}>Compte en attente de validation</Text>
        <Text style={s.subtitle}>
          Votre compte <Text style={s.bold}>{roleLabel}</Text> a bien été créé. Notre équipe l'examine actuellement.
        </Text>

        <View style={s.infoCard}>
          <Text style={s.infoTitle}>Ce qui se passe maintenant</Text>
          <Text style={s.infoItem}>• Notre équipe vérifie vos informations</Text>
          <Text style={s.infoItem}>• La validation prend généralement 24 à 48 h</Text>
          <Text style={s.infoItem}>• Vous recevrez un e-mail et une notification dès l'activation</Text>
        </View>

        <View style={s.infoCard}>
          <Text style={s.infoTitle}>Besoin d'aide ?</Text>
          <Text style={s.infoItem}>📧  support@primeo.ci</Text>
          <Text style={s.infoItem}>📞  +225 07 00 00 00 00</Text>
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={logout} accessibilityRole="button">
          <Text style={s.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, paddingTop: 16, backgroundColor: '#F9FAFB' },
  content:       { padding: 24, gap: 20, paddingBottom: 40, alignItems: 'center' },
  iconWrap:      { width: 96, height: 96, borderRadius: 48, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  iconWrapError: { backgroundColor: '#FEE2E2' },
  icon:          { fontSize: 48 },
  title:         { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },
  subtitle:      { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  bold:          { fontWeight: '700', color: '#111827' },
  infoCard:      { width: '100%', backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 8, elevation: 1 },
  errorCard:     { borderWidth: 1, borderColor: '#FECACA' },
  infoTitle:     { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  infoItem:      { fontSize: 13, color: '#6B7280', lineHeight: 20 },
  logoutBtn:     { marginTop: 8, paddingVertical: 14, paddingHorizontal: 32, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12 },
  logoutText:    { fontSize: 15, fontWeight: '600', color: '#374151' },
});
