import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { ClientScreenProps } from '@navigation/types';

type Props = ClientScreenProps<'VirtualTour'>;

export function VirtualTourScreen({ navigation, route }: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>
      <View style={styles.content}>
        <Text style={styles.icon}>🔭</Text>
        <Text style={styles.title}>Visite virtuelle 360°</Text>
        <Text style={styles.sub}>
          La visite virtuelle 3D est disponible uniquement dans l'application mobile.
        </Text>
        <Text style={styles.hint}>
          {route.params.propertyName}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  back:      { padding: 20, paddingTop: 48 },
  backText:  { color: '#fff', fontSize: 16, fontWeight: '600' },
  content:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  icon:      { fontSize: 64 },
  title:     { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
  sub:       { fontSize: 15, color: '#9CA3AF', textAlign: 'center', lineHeight: 22 },
  hint:      { fontSize: 13, color: '#6B7280', textAlign: 'center', fontStyle: 'italic' },
});
