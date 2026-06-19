// Écran de maintenance — affiché en plein écran quand l'API renvoie 503
// (mode maintenance actif). Montre le message, l'heure estimée de retour
// et un bouton « Réessayer » qui ré-interroge le statut.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMaintenanceStore } from '../../store/maintenanceStore';

function formatEta(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('fr-FR', {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'long',
  });
}

export default function MaintenanceScreen() {
  const { message, estimatedEnd, refresh } = useMaintenanceStore();
  const [checking, setChecking] = useState(false);

  const eta = formatEta(estimatedEnd);

  const onRetry = async () => {
    setChecking(true);
    await refresh();
    setChecking(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="construct-outline" size={64} color="#1056E0" />
      </View>
      <Text style={styles.title}>Maintenance en cours</Text>
      <Text style={styles.message}>
        {message ?? 'Primeo est en maintenance. Nous revenons très vite — merci de votre patience.'}
      </Text>
      {eta ? (
        <View style={styles.etaBadge}>
          <Ionicons name="time-outline" size={16} color="#1056E0" />
          <Text style={styles.etaText}>Retour estimé : {eta}</Text>
        </View>
      ) : null}
      <TouchableOpacity style={styles.btn} onPress={onRetry} disabled={checking} accessibilityRole="button">
        {checking
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>Réessayer</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, paddingTop: 48, backgroundColor: '#F7F9FC' },
  iconWrap: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: '#E8F0FE',
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#16224D', marginBottom: 12 },
  message: { fontSize: 16, color: '#555', textAlign: 'center', lineHeight: 24, marginBottom: 20 },
  etaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8F0FE',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 28,
  },
  etaText: { color: '#1056E0', fontWeight: '600', fontSize: 14 },
  btn: { backgroundColor: '#1056E0', borderRadius: 10, paddingHorizontal: 40, paddingVertical: 14, minWidth: 160, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
