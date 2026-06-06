// AddPropertyScreen: multi-step wizard to create a new residence listing
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../../../../components/layout/ScreenWrapper';

const STEPS = ['Infos de base', 'Caractéristiques', 'Équipements', 'Médias', 'Tarifs', 'Règles', 'Disponibilités'];

export default function AddPropertyScreen({ navigation }: any) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const handleChange = (key: string, value: any) => setFormData(prev => ({ ...prev, [key]: value }));

  return (
    <ScreenWrapper>
      <View style={styles.progress}>
        <Text style={styles.stepLabel}>{currentStep + 1}/{STEPS.length} — {STEPS[currentStep]}</Text>
        <View style={styles.progressBar}><View style={[styles.fill, { width: `${((currentStep + 1) / STEPS.length) * 100}%` }]} /></View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.placeholder}>Étape {currentStep + 1}: {STEPS[currentStep]}</Text>
      </ScrollView>
      <View style={styles.nav}>
        {currentStep > 0 && <TouchableOpacity style={styles.back} onPress={() => setCurrentStep(p => p - 1)}><Text style={styles.backText}>Précédent</Text></TouchableOpacity>}
        <TouchableOpacity style={styles.next} onPress={() => currentStep < STEPS.length - 1 ? setCurrentStep(p => p + 1) : navigation.goBack()}>
          <Text style={styles.nextText}>{currentStep === STEPS.length - 1 ? 'Publier' : 'Suivant'}</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  progress: { padding: 16, backgroundColor: '#EFF5FF' },
  stepLabel: { fontSize: 13, color: '#1056E0', fontWeight: '600', marginBottom: 8 },
  progressBar: { height: 6, backgroundColor: '#DBE8FE', borderRadius: 3 },
  fill: { height: '100%', backgroundColor: '#1056E0', borderRadius: 3 },
  content: { padding: 16 },
  placeholder: { color: '#999', fontSize: 14 },
  nav: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: '#eee' },
  back: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, alignItems: 'center' },
  backText: { color: '#555', fontWeight: '600' },
  next: { flex: 2, backgroundColor: '#1056E0', borderRadius: 10, padding: 14, alignItems: 'center' },
  nextText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
