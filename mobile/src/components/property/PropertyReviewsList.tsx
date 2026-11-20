// PropertyReviewsList: aperçu (3 avis max) destiné à une page déjà défilante
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ReviewCard } from '../review/ReviewCard';

interface Review { id: string; author: string; rating: number; comment: string; createdAt: string }

export const PropertyReviewsList: React.FC<{ reviews?: Review[]; onSeeAll?: () => void }> = ({ reviews, onSeeAll }) => {
  // Garde défensif : reviews peut être undefined/null
  const safeReviews = Array.isArray(reviews) ? reviews : [];
  return (
    // 3 avis max : rendu simple (pas de FlatList) — une liste virtualisée placée dans le
    // ScrollView de la fiche casse le « windowing » et provoque des erreurs DOM sur le web.
    <View>
      {safeReviews.slice(0, 3).map((item) => <ReviewCard key={item.id} review={item} />)}
      {onSeeAll && safeReviews.length > 3 ? (
        <Text style={styles.seeAll} onPress={onSeeAll}>Voir tous les avis →</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  seeAll: { color: '#1056E0', fontWeight: '700', textAlign: 'center', paddingVertical: 12 },
});
