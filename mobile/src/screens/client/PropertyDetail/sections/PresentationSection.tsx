import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props { description: string; }

export function PresentationSection({ description }: Props) {
  const [expanded, setExpanded] = useState(false);
  const SHORT_LIMIT = 200;
  const isLong = description.length > SHORT_LIMIT;
  const shown = expanded || !isLong ? description : description.slice(0, SHORT_LIMIT) + '…';

  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{shown}</Text>
      {isLong && (
        <TouchableOpacity onPress={() => setExpanded(e => !e)}>
          <Text style={styles.toggle}>{expanded ? 'Voir moins ↑' : 'Voir plus ↓'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 14 },
  text: { fontSize: 14, color: '#374151', lineHeight: 22 },
  toggle: { color: '#1056E0', fontSize: 14, fontWeight: '600', marginTop: 6 },
});
