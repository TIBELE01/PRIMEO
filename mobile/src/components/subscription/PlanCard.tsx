// PlanCard: subscription plan comparison card
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const PLAN_CONFIG = {
  Essentiel: { price: 'Gratuit', commission: '9%', color: '#78909C' },
  Prestige: { price: '9 000 XOF/mois', commission: '5%', color: '#D67309' },
  Premium: { price: '24 000 XOF/mois', commission: '0%', color: '#1056E0' },
};

interface PlanCardProps {
  plan: 'Essentiel' | 'Prestige' | 'Premium';
  features: string[];
  isCurrent?: boolean;
  onSelect: () => void;
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan, features, isCurrent, onSelect }) => {
  const config = PLAN_CONFIG[plan];
  return (
    <View style={[styles.card, isCurrent && { borderColor: config.color, borderWidth: 2 }]}>
      {isCurrent && <View style={[styles.badge, { backgroundColor: config.color }]}><Text style={styles.badgeText}>Plan actuel</Text></View>}
      <Text style={[styles.planName, { color: config.color }]}>{plan}</Text>
      <Text style={styles.price}>{config.price}</Text>
      <Text style={styles.commission}>Commission: {config.commission}</Text>
      <View style={styles.divider} />
      {features.map((f, i) => <Text key={i} style={styles.feature}>✓ {f}</Text>)}
      {!isCurrent && (
        <TouchableOpacity style={[styles.btn, { backgroundColor: config.color }]} onPress={onSelect}>
          <Text style={styles.btnText}>Choisir {plan}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 20, marginBottom: 16, elevation: 2, borderWidth: 1, borderColor: '#eee' },
  badge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  planName: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  price: { fontSize: 16, color: '#333', marginBottom: 2 },
  commission: { fontSize: 13, color: '#777', marginBottom: 12 },
  divider: { height: 1, backgroundColor: '#eee', marginBottom: 12 },
  feature: { fontSize: 13, color: '#444', marginBottom: 6, lineHeight: 18 },
  btn: { borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 12 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
