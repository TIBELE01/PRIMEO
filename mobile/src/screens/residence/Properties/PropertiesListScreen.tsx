// PropertiesListScreen: list of all residence properties for the professional
import React from 'react';
import { FlatList, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function PropertiesListScreen({ navigation }: any) {
  return (
    <ScreenWrapper>
      <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddProperty')}>
        <Text style={styles.addText}>+ Ajouter une propriété</Text>
      </TouchableOpacity>
      <EmptyState icon="🏠" title="Aucune propriété" subtitle="Ajoutez votre première résidence" />
    </ScreenWrapper>
  );
}
const styles = StyleSheet.create({ addBtn: { backgroundColor: '#1056E0', margin: 16, borderRadius: 10, padding: 14, alignItems: 'center' }, addText: { color: '#fff', fontWeight: '700', fontSize: 14 } });
