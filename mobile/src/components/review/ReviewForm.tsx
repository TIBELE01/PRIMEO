// ReviewForm: star rating + comment textarea for submitting a review
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { RatingStars } from '../ui/RatingStars';

interface ReviewFormProps {
  onSubmit: (rating: number, comment: string) => void;
  loading?: boolean;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({ onSubmit, loading }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Votre note</Text>
      <RatingStars rating={rating} size={32} interactive onRate={setRating} />
      <Text style={[styles.label, { marginTop: 16 }]}>Votre commentaire</Text>
      <TextInput
        style={styles.textarea}
        value={comment}
        onChangeText={setComment}
        placeholder="Décrivez votre expérience..."
        multiline
        numberOfLines={5}
        maxLength={1000}
      />
      <TouchableOpacity style={[styles.btn, (!rating || loading) && styles.disabled]} onPress={() => onSubmit(rating, comment)} disabled={!rating || loading}>
        <Text style={styles.btnText}>{loading ? 'Envoi...' : 'Publier l\'avis'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 8 },
  textarea: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 14, textAlignVertical: 'top', minHeight: 100 },
  btn: { backgroundColor: '#1056E0', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
  disabled: { backgroundColor: '#ccc' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
