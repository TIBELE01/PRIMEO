// PropertyReviewsList: scrollable list of property reviews
import React from 'react';
import { FlatList, Text, StyleSheet } from 'react-native';
import { ReviewCard } from '../review/ReviewCard';

interface Review { id: string; author: string; rating: number; comment: string; createdAt: string }

export const PropertyReviewsList: React.FC<{ reviews?: Review[]; onSeeAll?: () => void }> = ({ reviews, onSeeAll }) => {
  // Garde défensif : reviews peut être undefined/null
  const safeReviews = Array.isArray(reviews) ? reviews : [];
  return (
    <FlatList
      data={safeReviews.slice(0, 3)}
      keyExtractor={r => r.id}
      scrollEnabled={false}
      renderItem={({ item }) => <ReviewCard review={item} />}
      ListFooterComponent={onSeeAll && safeReviews.length > 3 ? (
        <Text style={styles.seeAll} onPress={onSeeAll}>Voir tous les avis →</Text>
      ) : null}
    />
  );
};

const styles = StyleSheet.create({
  seeAll: { color: '#1056E0', fontWeight: '700', textAlign: 'center', paddingVertical: 12 },
});
