import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

interface Props {
  ownerId: string;
  ownerName: string;
  propertyId: string;
  color?: string;
  onContact?: () => void;
}

export function ContactHostSection({ ownerName, color = '#1056E0', onContact }: Props) {
  const handleContact = () => {
    if (onContact) { onContact(); return; }
    Alert.alert(
      'Messagerie sécurisée',
      `La messagerie avec ${ownerName} s'active automatiquement dès qu'une réservation est confirmée, afin de garantir des échanges sécurisés via Primeo.`,
      [{ text: 'Compris' }],
    );
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.subtitle}>
        Une question ? Contactez {ownerName} directement via la messagerie sécurisée.
      </Text>
      <TouchableOpacity style={[styles.btn, { borderColor: color }]} onPress={handleContact} activeOpacity={0.85}>
        <Text style={styles.btnIcon}>💬</Text>
        <Text style={[styles.btnText, { color }]}>Envoyer un message</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 14 },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 14, lineHeight: 20 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderRadius: 14, paddingVertical: 13 },
  btnIcon: { fontSize: 18 },
  btnText: { fontSize: 15, fontWeight: '700' },
});
