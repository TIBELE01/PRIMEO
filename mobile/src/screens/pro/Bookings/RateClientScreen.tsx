import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Switch, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { clientRatingsApi } from '../../../services/api/endpoints/clientRatings';

interface StarRowProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
}

function StarRow({ label, value, onChange }: StarRowProps) {
  return (
    <View style={styles.criterionRow}>
      <Text style={styles.criterionLabel}>{label}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map(n => (
          <TouchableOpacity key={n} onPress={() => onChange(n)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
            <Ionicons
              name={n <= value ? 'star' : 'star-outline'}
              size={28}
              color={n <= value ? '#F59E0B' : '#D1D5DB'}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function RateClientScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { bookingId = '', clientId = '' } = (route.params ?? {}) as { bookingId?: string; clientId?: string };

  const [respectRating,       setRespectRating]       = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [punctualityRating,   setPunctualityRating]   = useState(0);
  const [rulesRating,         setRulesRating]         = useState(0);
  const [comment, setComment]   = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const allFilled = respectRating > 0 && communicationRating > 0 && punctualityRating > 0 && rulesRating > 0;
  const avgRating = allFilled
    ? ((respectRating + communicationRating + punctualityRating + rulesRating) / 4).toFixed(1)
    : null;

  const handleSubmit = async () => {
    if (!allFilled) {
      Alert.alert('Évaluation incomplète', 'Veuillez noter les quatre critères.');
      return;
    }
    Alert.alert(
      'Confirmer l\'évaluation',
      'Cette évaluation ne pourra pas être modifiée après soumission.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Soumettre',
          onPress: async () => {
            setLoading(true);
            try {
              await clientRatingsApi.create({
                bookingId,
                respectRating,
                communicationRating,
                punctualityRating,
                rulesRating,
                comment: comment.trim() || undefined,
                isPublic,
              });
              setSubmitted(true);
            } catch (e: any) {
              const msg = e?.response?.data?.message ?? 'Une erreur est survenue.';
              Alert.alert('Erreur', msg);
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={72} color="#1056E0" />
          <Text style={styles.successTitle}>Évaluation soumise</Text>
          <Text style={styles.successSub}>
            Merci pour votre retour. Cette évaluation restera confidentielle et ne sera visible que des professionnels.
          </Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Retour aux réservations</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Info notice */}
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
          <Text style={styles.noticeText}>
            La note moyenne du client est visible uniquement par les professionnels lors de la réception d'une demande. Elle ne peut pas être modifiée après soumission.
          </Text>
        </View>

        {/* Average preview */}
        {avgRating && (
          <View style={styles.avgCard}>
            <Text style={styles.avgLabel}>Note globale calculée</Text>
            <View style={styles.avgRow}>
              <Ionicons name="star" size={22} color="#F59E0B" />
              <Text style={styles.avgValue}>{avgRating} / 5</Text>
            </View>
          </View>
        )}

        {/* Criteria */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Critères d'évaluation</Text>
          <StarRow label="Respect des lieux"   value={respectRating}       onChange={setRespectRating} />
          <StarRow label="Communication"        value={communicationRating} onChange={setCommunicationRating} />
          <StarRow label="Ponctualité"          value={punctualityRating}   onChange={setPunctualityRating} />
          <StarRow label="Respect des règles"   value={rulesRating}         onChange={setRulesRating} />
        </View>

        {/* Comment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commentaire (optionnel)</Text>
          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            placeholder="Partagez votre expérience avec ce voyageur…"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            maxLength={1000}
          />
          <Text style={styles.charCount}>{comment.length}/1000</Text>

          {/* Public / private toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Commentaire public</Text>
              <Text style={styles.toggleSub}>
                {isPublic
                  ? 'Visible par le client et les autres professionnels'
                  : 'Visible uniquement par les professionnels'}
              </Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
              thumbColor={isPublic ? '#1056E0' : '#9CA3AF'}
            />
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, (!allFilled || loading) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!allFilled || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.submitBtnText}>Soumettre l'évaluation</Text>}
        </TouchableOpacity>

        <Text style={styles.immutableNote}>
          ⚠️ Cette évaluation ne pourra plus être modifiée après soumission.
        </Text>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 40 },
  notice: { flexDirection: 'row', gap: 8, backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, alignItems: 'flex-start' },
  noticeText: { flex: 1, fontSize: 12, color: '#1E40AF', lineHeight: 18 },
  avgCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  avgLabel: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  avgRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avgValue: { fontSize: 22, fontWeight: '800', color: '#111827' },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  criterionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  criterionLabel: { fontSize: 14, color: '#374151', flex: 1 },
  stars: { flexDirection: 'row', gap: 4 },
  commentInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 14, color: '#111827', minHeight: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, gap: 12 },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: 14, color: '#374151', fontWeight: '600' },
  toggleSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  submitBtn: { backgroundColor: '#1056E0', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: '#9CA3AF' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  immutableNote: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  successSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  backBtn: { backgroundColor: '#1056E0', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  backBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
