import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useOffline } from '../../hooks/useOffline';

export const NetworkStatus: React.FC = () => {
  const isOffline = useOffline();
  const translateY = useRef(new Animated.Value(-60)).current;
  const nd = Platform.OS !== 'web';

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isOffline ? 0 : -60,
      speed: 20,
      bounciness: 4,
      useNativeDriver: nd,
    }).start();
  }, [isOffline]);

  if (!isOffline) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY }] }]}>
      <Text style={styles.dot}>●</Text>
      <Text style={styles.text}>Hors connexion — mode lecture seule</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#D41313',
    paddingVertical: 9,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  text: { color: '#fff', fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
});
