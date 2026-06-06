// BoostCard: card for purchasing or viewing a property boost
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface BoostCardProps {
  propertyTitle: string;
  isActive: boolean;
  expiresAt?: string;
  daysLeft?: number;
  onBoost: () => void;
}

export const BoostCard: React.FC<BoostCardProps> = ({ propertyTitle, isActive, expiresAt, daysLeft, onBoost }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{propertyTitle}</Text>
      {isActive ? (
        <View style={styles.active}><Text style={styles.activeText}>🔥 Boosté — {daysLeft}j restants</Text></View>
      ) : (
        <TouchableOpacity style={styles.btn} onPress={onBoost}>
          <Text style={styles.btnText}>Booster — 2 000 XOF/3j</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, elevation: 1 },
  title: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  active: { backgroundColor: '#FFF8E1', borderRadius: 8, padding: 8, alignItems: 'center' },
  activeText: { color: '#D67309', fontWeight: '600' },
  btn: { backgroundColor: '#D67309', borderRadius: 8, padding: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});
