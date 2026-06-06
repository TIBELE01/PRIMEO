// ReferralCodeCard: displays the user's referral code with copy button
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Clipboard } from 'react-native';

interface ReferralCodeCardProps {
  code: string;
  totalEarned?: number;
  referralCount?: number;
}

export const ReferralCodeCard: React.FC<ReferralCodeCardProps> = ({ code, totalEarned, referralCount }) => {
  const handleCopy = () => { Clipboard.setString(code); };
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Votre code de parrainage</Text>
      <View style={styles.codeRow}>
        <Text style={styles.code}>{code}</Text>
        <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}><Text style={styles.copyText}>Copier</Text></TouchableOpacity>
      </View>
      {referralCount !== undefined && <Text style={styles.stat}>{referralCount} filleul(s) · {totalEarned?.toLocaleString() ?? 0} XOF gagnés</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#EFF5FF', borderRadius: 14, padding: 20, alignItems: 'center' },
  label: { fontSize: 13, color: '#555', marginBottom: 10 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  code: { fontSize: 26, fontWeight: '800', color: '#1056E0', letterSpacing: 4 },
  copyBtn: { backgroundColor: '#1056E0', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  copyText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  stat: { fontSize: 13, color: '#777' },
});
