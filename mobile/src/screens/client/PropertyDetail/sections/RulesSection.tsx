import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Property } from '@/types/property';

interface Props { property: Property; }

// Default house rules — can be extended once the API returns rules
const DEFAULT_RULES = [
  { icon: '🕙', text: 'Check-in: 14h00 — 22h00' },
  { icon: '🕙', text: 'Check-out avant 12h00' },
  { icon: '🚭', text: 'Non-fumeur' },
  { icon: '🐾', text: 'Animaux non admis' },
];

export function RulesSection({ property }: Props) {
  const [expanded, setExpanded] = useState(false);

  const rules = DEFAULT_RULES;
  const visible = expanded ? rules : rules.slice(0, 3);

  return (
    <View style={styles.wrap}>
      <View style={styles.list}>
        {visible.map((r, i) => (
          <View key={i} style={styles.rule}>
            <Text style={styles.ruleIcon}>{r.icon}</Text>
            <Text style={styles.ruleText}>{r.text}</Text>
          </View>
        ))}
      </View>
      {rules.length > 3 && (
        <TouchableOpacity onPress={() => setExpanded(e => !e)}>
          <Text style={styles.toggle}>
            {expanded ? 'Voir moins' : `Voir les ${rules.length - 3} règles supplémentaires`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 14 },
  list: { gap: 10 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ruleIcon: { fontSize: 18, width: 26 },
  ruleText: { fontSize: 14, color: '#374151', flex: 1 },
  toggle: { color: '#1056E0', fontSize: 13, fontWeight: '600', marginTop: 10 },
});
