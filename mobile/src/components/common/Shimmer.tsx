import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, Platform, DimensionValue } from 'react-native';

interface ShimmerProps {
  width?: DimensionValue;
  height: number;
  borderRadius?: number;
  style?: object;
}

export const Shimmer: React.FC<ShimmerProps> = ({ width = '100%', height, borderRadius = 8, style }) => {
  const translateX = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(translateX, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: Platform.OS !== 'web',
      })
    ).start();
    return () => translateX.stopAnimation();
  }, []);

  return (
    <View style={[styles.base, { width, height, borderRadius }, style]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: '#F8FAFC',
            opacity: 0.9,
            transform: [
              {
                translateX: translateX.interpolate({
                  inputRange: [-1, 1],
                  outputRange: [-300, 300],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#E6EAF2',
    overflow: 'hidden',
  },
});
