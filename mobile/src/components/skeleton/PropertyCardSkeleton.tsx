import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';

export const PropertyCardSkeleton: React.FC = () => {
  const shimmerX = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerX, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: Platform.OS !== 'web',
      })
    ).start();
  }, []);

  const translateX = shimmerX.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-100%' as unknown as number, '100%' as unknown as number],
  });

  const Shimmer = () => (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        styles.shimmer,
        { transform: [{ translateX }] },
      ]}
    />
  );

  return (
    <View style={styles.card}>
      <View style={styles.imgWrap}>
        <View style={styles.img} />
        <Shimmer />
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <View style={[styles.line, styles.titleLine]} />
          <View style={[styles.line, styles.ratingLine]} />
        </View>
        <View style={[styles.line, styles.cityLine]} />
        <View style={[styles.line, styles.priceLine]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#0F1729',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 6,
  },
  imgWrap: { height: 220, backgroundColor: '#E6EAF2', overflow: 'hidden' },
  img: { width: '100%', height: '100%', backgroundColor: '#E6EAF2' },
  shimmer: {
    width: '60%',
    backgroundColor: '#F1F5F9',
    opacity: 0.85,
  },
  body: { padding: 14, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  line: { backgroundColor: '#E6EAF2', borderRadius: 6 },
  titleLine: { height: 16, width: '62%' },
  ratingLine: { height: 14, width: '18%' },
  cityLine: { height: 13, width: '40%' },
  priceLine: { height: 15, width: '32%' },
});
