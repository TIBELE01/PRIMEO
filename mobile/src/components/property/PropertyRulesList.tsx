// PropertyRulesList: house rules shown on property detail
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const PropertyRulesList: React.FC<{ rules: string[] }> = ({ rules }) => (
  <View style={styles.container}>
    {rules.map((rule, i) => (
      <View key={i} style={styles.row}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.rule}>{rule}</Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  bullet: { color: '#1056E0', fontSize: 16, lineHeight: 20 },
  rule: { flex: 1, fontSize: 14, color: '#444', lineHeight: 20 },
});
