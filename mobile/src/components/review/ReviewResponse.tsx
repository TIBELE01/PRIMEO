// ReviewResponse: professional's reply shown under a review
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ReviewResponseProps {
  response: string;
  respondedAt: string;
  authorName: string;
}

export const ReviewResponse: React.FC<ReviewResponseProps> = ({ response, respondedAt, authorName }) => (
  <View style={styles.container}>
    <Text style={styles.label}>Réponse de {authorName}</Text>
    <Text style={styles.text}>{response}</Text>
    <Text style={styles.date}>{new Date(respondedAt).toLocaleDateString('fr-FR')}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { backgroundColor: '#F1F8E9', borderRadius: 8, padding: 12, marginTop: 8, borderLeftWidth: 3, borderLeftColor: '#1056E0' },
  label: { fontWeight: '700', fontSize: 12, color: '#1056E0', marginBottom: 4 },
  text: { fontSize: 13, color: '#444', lineHeight: 18 },
  date: { fontSize: 11, color: '#999', marginTop: 6 },
});
