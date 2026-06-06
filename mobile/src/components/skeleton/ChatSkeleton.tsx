// ChatSkeleton: placeholder bubbles while chat messages load
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';

export const ChatSkeleton: React.FC = () => {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
    ])).start();
  }, []);
  const bubbles = [{ mine: false, w: '60%' }, { mine: true, w: '45%' }, { mine: false, w: '70%' }, { mine: true, w: '35%' }, { mine: false, w: '55%' }];
  return (
    <Animated.View style={[styles.container, { opacity }]}>
      {bubbles.map((b, i) => (
        <View key={i} style={[styles.row, b.mine && styles.right]}>
          <View style={[styles.bubble, { width: b.w as any, backgroundColor: b.mine ? '#DBE8FE' : '#e0e0e0' }]} />
        </View>
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  row: { alignItems: 'flex-start' },
  right: { alignItems: 'flex-end' },
  bubble: { height: 36, borderRadius: 16 },
});
