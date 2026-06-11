import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { ClientScreenProps } from '../../../navigation/types';
import { reviewsApi } from '../../../services/api/endpoints/reviews';

type Props = ClientScreenProps<'WriteReview'>;

const CRITERIA: { key: string; label: string; icon: string }[] = [
  { key: 'cleanlinessRating',     label: 'Propreté',                 icon: '🧹' },
  { key: 'communicationRating',   label: 'Communication',            icon: '💬' },
  { key: 'accuracyRating',        label: "Exactitude de l'annonce",  icon: '📋' },
  { key: 'locationRating',        label: 'Emplacement',              icon: '📍' },
  { key: 'valueRating',           label: 'Rapport qualité-prix',     icon: '💰' },
];

function StarRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
          <Text style={[styles.star, n <= value && styles.starFilled]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function avgCriteria(ratings: Record<string, number>): number {
  const vals = Object.values(ratings).filter(v => v > 0);
  if (vals.length === 0) return 0;
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

export function WriteReviewScreen({ navigation, route }: Props) {
  const { bookingId, propertyId } = route.params ?? ({} as Partial<Props['route']['params']>);

  const [globalRating, setGlobalRating] = useState(0);
  const [criteria, setCriteria] = useState<Record<string, number>>({
    cleanlinessRating: 0,
    communicationRating: 0,
    accuracyRating: 0,
    locationRating: 0,
    valueRating: 0,
  });
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const effectiveRating = globalRating || avgCriteria(criteria);

  const handlePickPhotos = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'image/*',
      multiple: true,
      copyToCacheDirectory: false,
    });
    if (!result.canceled) {
      const names = result.assets.map(a => a.name ?? a.uri.split('/').pop() ?? 'photo');
      setPhotos(prev => [...prev, ...names].slice(0, 5));
    }
  };

  const handleSubmit = async () => {
    if (effectiveRating === 0) {
      Alert.alert('Note requise', 'Veuillez donner au moins une note globale.');
      return;
    }
    if (comment.length > 0 && comment.length < 10) {
      Alert.alert('Commentaire trop court', 'Le commentaire doit faire au moins 10 caractères.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        bookingId,
        rating: effectiveRating,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      };
      CRITERIA.forEach(c => {
        if (criteria[c.key] > 0) payload[c.key] = criteria[c.key];
      });

      await reviewsApi.create(payload);

      Alert.alert(
        'Avis soumis ✓',
        'Merci pour votre retour ! Votre avis est en attente de modération et sera publié sous peu.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Une erreur est survenue.';
      if (err?.response?.status === 409) {
        Alert.alert('Avis déjà soumis', 'Vous avez déjà laissé un avis pour cette réservation.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Erreur', msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Laisser un avis</Text>
          <Text style={styles.subtitle}>Partagez votre expérience pour aider la communauté</Text>
        </View>

        {/* Global rating */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Note globale</Text>
          <View style={styles.globalStars}>
            {[1, 2, 3, 4, 5].map(n => (
              <TouchableOpacity key={n} onPress={() => setGlobalRating(n)}>
                <Text style={[styles.globalStar, n <= (globalRating || avgCriteria(criteria)) && styles.globalStarFilled]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          {effectiveRating > 0 && (
            <Text style={styles.ratingLabel}>
              {['', 'Très mauvais', 'Mauvais', 'Correct', 'Bien', 'Excellent'][effectiveRating]}
            </Text>
          )}
        </View>

        {/* Criteria */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sous-critères (optionnels)</Text>
          {CRITERIA.map(c => (
            <View key={c.key} style={styles.criteriaRow}>
              <Text style={styles.criteriaIcon}>{c.icon}</Text>
              <Text style={styles.criteriaLabel}>{c.label}</Text>
              <StarRow value={criteria[c.key]} onChange={v => setCriteria(prev => ({ ...prev, [c.key]: v }))} />
            </View>
          ))}
        </View>

        {/* Comment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commentaire</Text>
          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            placeholder="Décrivez votre expérience (optionnel, min. 10 caractères si renseigné)..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={5}
            maxLength={2000}
          />
          <Text style={styles.charCount}>{comment.length}/2000</Text>
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos ({photos.length}/5)</Text>
          <TouchableOpacity style={styles.photoPickBtn} onPress={handlePickPhotos} disabled={photos.length >= 5}>
            <Text style={styles.photoPickIcon}>📷</Text>
            <Text style={styles.photoPickText}>Ajouter des photos</Text>
          </TouchableOpacity>
          {photos.length > 0 && (
            <View style={styles.photoList}>
              {photos.map((name, i) => (
                <View key={i} style={styles.photoChip}>
                  <Text style={styles.photoChipText} numberOfLines={1}>{name}</Text>
                  <TouchableOpacity onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}>
                    <Text style={styles.photoRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Moderation notice */}
        <View style={styles.notice}>
          <Text style={styles.noticeIcon}>🔍</Text>
          <Text style={styles.noticeText}>
            Votre avis sera examiné par notre équipe avant publication. Vous serez notifié une fois publié.
          </Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, (effectiveRating === 0 || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={effectiveRating === 0 || submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitText}>Soumettre mon avis</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 14 },
  globalStars: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 8 },
  globalStar: { fontSize: 40, color: '#E5E7EB' },
  globalStarFilled: { color: '#D67309' },
  ratingLabel: { textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#D67309' },
  criteriaRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F9FAFB' },
  criteriaIcon: { fontSize: 18, width: 28 },
  criteriaLabel: { flex: 1, fontSize: 14, color: '#374151' },
  stars: { flexDirection: 'row', gap: 4 },
  star: { fontSize: 24, color: '#E5E7EB' },
  starFilled: { color: '#D67309' },
  commentInput: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#111827',
    textAlignVertical: 'top', minHeight: 100,
  },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 4 },
  photoPickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10, borderStyle: 'dashed',
    padding: 14, justifyContent: 'center',
  },
  photoPickIcon: { fontSize: 20 },
  photoPickText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  photoList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  photoChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, maxWidth: 160 },
  photoChipText: { flex: 1, fontSize: 12, color: '#374151' },
  photoRemove: { fontSize: 12, color: '#9CA3AF', fontWeight: '700' },
  notice: { flexDirection: 'row', gap: 10, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, marginBottom: 20, alignItems: 'flex-start' },
  noticeIcon: { fontSize: 18 },
  noticeText: { flex: 1, fontSize: 13, color: '#1D4ED8', lineHeight: 19 },
  submitBtn: { backgroundColor: '#1056E0', borderRadius: 12, padding: 16, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: '#A7F3D0' },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
