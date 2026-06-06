// Sélecteur de voyageurs / convives avec compteur +/−.
// label et icon sont adaptés selon le type de page (hébergement vs restaurant).
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label?: string;
  icon?: string;
  color?: string;
}

export function GuestPicker({
  value, onChange,
  min = 1, max = 20,
  label = 'Voyageurs',
  icon = '👥',
  color = '#1056E0',
}: Props) {
  return (
    <View style={gp.wrap}>
      <Text style={gp.icon}>{icon}</Text>
      <View style={gp.info}>
        <Text style={gp.label}>{label}</Text>
        <Text style={gp.hint}>Maximum {max} personnes</Text>
      </View>
      <View style={gp.counter}>
        <TouchableOpacity
          style={[gp.btn, value <= min && gp.btnDisabled, { borderColor: color }]}
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
        >
          <Text style={[gp.btnText, { color }]}>−</Text>
        </TouchableOpacity>
        <Text style={gp.count}>{value}</Text>
        <TouchableOpacity
          style={[gp.btn, value >= max && gp.btnDisabled, { borderColor: color }]}
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
        >
          <Text style={[gp.btnText, { color }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const gp = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, gap: 10,
  },
  icon: { fontSize: 20 },
  info: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: '#111827' },
  hint: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1.5, justifyContent: 'center', alignItems: 'center',
  },
  btnDisabled: { opacity: 0.3 },
  btnText: { fontSize: 18, lineHeight: 20, fontWeight: '600' },
  count: { fontSize: 16, fontWeight: '800', color: '#111827', minWidth: 22, textAlign: 'center' },
});
