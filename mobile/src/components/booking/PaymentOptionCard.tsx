import React, { useRef } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Animated, Platform } from 'react-native';

interface Props {
  option: 'full_online' | 'ten_percent_online' | 'zero_online';
  label: string;
  description: string;
  amount: number;
  cashAmount?: number;
  selected: boolean;
  onSelect: () => void;
  isRecommended?: boolean;
  currency?: string;
}

const OPTION_ICONS: Record<Props['option'], string> = {
  full_online: '💳',
  ten_percent_online: '🤝',
  zero_online: '💵',
};

function formatFCFA(n: number, currency = 'FCFA'): string {
  return n.toLocaleString('fr-CI') + ' ' + currency;
}

export const PaymentOptionCard: React.FC<Props> = ({
  option, label, description, amount, cashAmount, selected, onSelect, isRecommended = false, currency = 'FCFA',
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const nd = Platform.OS !== 'web';
  const icon = OPTION_ICONS[option];

  return (
    <View>
      <Animated.View style={[styles.cardWrap, { transform: [{ scale }] }]}>
        <TouchableOpacity
          style={[styles.card, selected && styles.cardSelected]}
          onPress={onSelect}
          onPressIn={() => Animated.spring(scale, { toValue: 0.98, speed: 50, bounciness: 2, useNativeDriver: nd }).start()}
          onPressOut={() => Animated.spring(scale, { toValue: 1, speed: 50, bounciness: 2, useNativeDriver: nd }).start()}
          activeOpacity={1}
        >
          {isRecommended && (
            <View style={styles.recBadge}>
              <Text style={styles.recTxt}>Recommandé</Text>
            </View>
          )}
          <View style={styles.row}>
            <View style={[styles.radio, selected && styles.radioSel]}>
              {selected && <View style={styles.radioInner} />}
            </View>
            <View style={styles.info}>
              <Text style={styles.iconLabel}>
                {icon} <Text style={styles.lbl}>{label}</Text>
              </Text>
              <Text style={styles.desc}>{description}</Text>
            </View>
            <View style={styles.amtCol}>
              <Text style={[styles.amount, selected && styles.amountSel]}>
                {formatFCFA(amount, currency)}
              </Text>
              {option === 'ten_percent_online' && cashAmount != null && cashAmount > 0 && (
                <Text style={styles.cashAmt}>+ {formatFCFA(cashAmount, currency)} sur place</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {option === 'zero_online' && selected && (
        <View style={styles.warning}>
          <Text style={styles.warningTxt}>⚠️ L'hôte peut annuler si impayé avant votre arrivée.</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrap: { marginBottom: 10 },
  card: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#fff',
    position: 'relative',
    shadowColor: '#0F1729',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSelected: {
    borderColor: '#1056E0',
    backgroundColor: '#EFF5FF',
    shadowColor: '#1056E0',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  recBadge: {
    position: 'absolute',
    top: -1,
    right: 12,
    backgroundColor: '#1056E0',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  recTxt: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSel: { borderColor: '#1056E0' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1056E0' },
  info: { flex: 1 },
  iconLabel: { fontSize: 14, color: '#0F1729' },
  lbl: { fontSize: 14, fontWeight: '700', color: '#0F1729' },
  desc: { fontSize: 12, color: '#64748B', marginTop: 2, lineHeight: 16 },
  amtCol: { alignItems: 'flex-end', minWidth: 80 },
  amount: { fontSize: 14, fontWeight: '800', color: '#334155', textAlign: 'right' },
  amountSel: { color: '#1056E0' },
  cashAmt: { fontSize: 11, color: '#64748B', textAlign: 'right', marginTop: 2 },
  warning: {
    backgroundColor: '#FFF7ED',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: -4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  warningTxt: { fontSize: 12, color: '#92400E', lineHeight: 18 },
});
