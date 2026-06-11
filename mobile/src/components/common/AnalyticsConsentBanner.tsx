// Bandeau de consentement analytics — affiché au premier lancement tant que
// l'utilisateur n'a pas fait de choix. Conformité : aucun événement n'est
// envoyé avant un consentement explicite ; le refus est définitif (modifiable
// plus tard via les réglages le cas échéant).
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { initAnalytics, setAnalyticsConsent } from '../../services/analytics';

export default function AnalyticsConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    initAnalytics().then((consent) => {
      if (consent === null) setVisible(true);
    });
  }, []);

  if (!visible) return null;

  const choose = async (value: 'granted' | 'denied') => {
    await setAnalyticsConsent(value);
    setVisible(false);
  };

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.title}>Statistiques d'utilisation</Text>
      <Text style={styles.text}>
        Primeo souhaite collecter des statistiques d'usage anonymes (aucune donnée
        personnelle) pour améliorer l'application. Vous pouvez refuser sans impact
        sur les fonctionnalités.
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.declineBtn} onPress={() => choose('denied')} accessibilityRole="button">
          <Text style={styles.declineText}>Refuser</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptBtn} onPress={() => choose('granted')} accessibilityRole="button">
          <Text style={styles.acceptText}>Accepter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute', left: 12, right: 12, bottom: 24,
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 8, borderWidth: 1, borderColor: '#EDF0F5',
  },
  title: { fontSize: 15, fontWeight: '800', color: '#16224D', marginBottom: 6 },
  text: { fontSize: 13, color: '#555', lineHeight: 19, marginBottom: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  declineBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#D5DBE5' },
  declineText: { color: '#555', fontWeight: '600', fontSize: 14 },
  acceptBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: '#1056E0' },
  acceptText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
