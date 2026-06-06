// ListSkeleton: stacked row skeletons for list screens
import React from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { PropertyCardSkeleton } from './PropertyCardSkeleton';

interface ListSkeletonProps {
  count?: number;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({ count = 4 }) => (
  <View>{Array.from({ length: count }).map((_, i) => <PropertyCardSkeleton key={i} />)}</View>
);
