import React, { useRef } from 'react';
import { Animated, TouchableOpacity, Platform, ViewStyle, StyleProp } from 'react-native';

interface PressableScaleProps {
  children: React.ReactNode;
  onPress?: () => void;
  scale?: number;
  style?: StyleProp<ViewStyle>;
  activeOpacity?: number;
  disabled?: boolean;
}

export const PressableScale: React.FC<PressableScaleProps> = ({
  children, onPress, scale: toScale = 0.97, style, activeOpacity = 1, disabled,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const nd = Platform.OS !== 'web';

  const onIn = () =>
    Animated.spring(scale, { toValue: toScale, speed: 50, bounciness: 2, useNativeDriver: nd }).start();
  const onOut = () =>
    Animated.spring(scale, { toValue: 1, speed: 50, bounciness: 2, useNativeDriver: nd }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onIn}
        onPressOut={onOut}
        activeOpacity={activeOpacity}
        disabled={disabled}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};
