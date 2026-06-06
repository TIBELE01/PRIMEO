// DetailSkeleton: skeleton layout for property/booking detail screens
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';

export const DetailSkeleton: React.FC = () => {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
    ])).start();
  }, []);
  return (
    <Animated.View style={{ opacity }}>
      <View style={styles.hero} />
      <View style={styles.body}>
        {[200, 140, 180, 120, 160].map((w, i) => <View key={i} style={[styles.line, { width: `${w / 2.5}%` }]} />)}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  hero: { width: '100%', height: 280, backgroundColor: '#e0e0e0' },
  body: { padding: 16, gap: 12 },
  line: { height: 14, backgroundColor: '#e0e0e0', borderRadius: 4 },
});
