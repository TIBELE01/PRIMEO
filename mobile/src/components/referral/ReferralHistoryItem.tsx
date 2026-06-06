// ReferralHistoryItem: single row in the referral history list
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ReferralHistoryItemProps {
  refereeName: string;
  joinedAt: string;
  earnedAmount: number;
  status: 'pending' | 'credited';
}

export const ReferralHistoryItem: React.FC<ReferralHistoryItemProps> = ({ refereeName, joinedAt, earnedAmount, status }) => (
  <View style={styles.item}>
    <View style={styles.avatar}><Text style={styles.initials}>{((refereeName ?? '')[0] ?? '?').toUpperCase()}</Text></View>
    <View style={styles.info}>
      <Text style={styles.name}>{refereeName ?? '—'}</Text>
      <Text style={styles.date}>{joinedAt}</Text>
    </View>
    <View>
      <Text style={styles.amount}>+{(earnedAmount ?? 0).toLocaleString()} XOF</Text>
      <Text style={[styles.status, status === 'credited' && styles.credited]}>{status === 'credited' ? 'Crédité' : 'En attente'}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1056E0', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  initials: { color: '#fff', fontWeight: '700' },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600' },
  date: { fontSize: 12, color: '#999' },
  amount: { fontSize: 14, fontWeight: '700', color: '#1056E0', textAlign: 'right' },
  status: { fontSize: 11, color: '#D67309', textAlign: 'right' },
  credited: { color: '#1056E0' },
});
