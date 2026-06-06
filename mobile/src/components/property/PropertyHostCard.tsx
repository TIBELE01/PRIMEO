// PropertyHostCard: host profile snippet shown on property detail
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar } from '../ui/Avatar';

interface PropertyHostCardProps {
  host: { name: string; joinedAt: string; avatarUrl?: string; responseRate?: number };
  onContact: () => void;
}

export const PropertyHostCard: React.FC<PropertyHostCardProps> = ({ host, onContact }) => (
  <View style={styles.card}>
    <View style={styles.row}>
      <Avatar name={host.name} uri={host.avatarUrl} size={52} />
      <View style={styles.info}>
        <Text style={styles.name}>{host.name}</Text>
        <Text style={styles.joined}>Membre depuis {host.joinedAt}</Text>
        {host.responseRate !== undefined && <Text style={styles.rate}>Taux de réponse: {host.responseRate}%</Text>}
      </View>
    </View>
    <TouchableOpacity style={styles.btn} onPress={onContact}>
      <Text style={styles.btnText}>Contacter l'hôte</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 1 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  info: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: '#222' },
  joined: { fontSize: 13, color: '#777', marginTop: 2 },
  rate: { fontSize: 12, color: '#1056E0', marginTop: 2 },
  btn: { borderWidth: 1.5, borderColor: '#1056E0', borderRadius: 10, padding: 12, alignItems: 'center' },
  btnText: { color: '#1056E0', fontWeight: '700' },
});
