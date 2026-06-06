import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Modal, Animated, Platform } from 'react-native';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible, message }) => {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const nd = Platform.OS !== 'web';

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, speed: 20, bounciness: 6, useNativeDriver: nd }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: nd }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scale, { toValue: 0.85, duration: 150, useNativeDriver: nd }),
        Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: nd }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.overlay}>
        <Animated.View style={[styles.box, { transform: [{ scale }], opacity }]}>
          <View style={styles.spinnerWrap}>
            <ActivityIndicator size="large" color="#1056E0" />
          </View>
          {!!message && <Text style={styles.msg}>{message}</Text>}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,41,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: 'center',
    shadowColor: '#0F1729',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.22,
    shadowRadius: 40,
    elevation: 16,
    minWidth: 160,
  },
  spinnerWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  msg: { fontSize: 14, color: '#475569', textAlign: 'center', fontWeight: '500', lineHeight: 20 },
});
