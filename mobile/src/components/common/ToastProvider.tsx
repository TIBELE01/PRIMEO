// ToastProvider: renders floating toast notifications from uiStore queue
import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useUIStore } from '../../store/uiStore';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toasts } = useUIStore();
  return (
    <View style={styles.root}>
      {children}
      <View style={styles.toastContainer} pointerEvents="none">
        {toasts.map(t => (
          <View key={t.id} style={[styles.toast, t.type === 'error' && styles.error, t.type === 'success' && styles.success]}>
            <Text style={styles.text}>{t.message}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  toastContainer: { position: 'absolute', bottom: 80, left: 16, right: 16, gap: 8 },
  toast: { backgroundColor: '#333', borderRadius: 10, padding: 12, alignItems: 'center' },
  error: { backgroundColor: '#B71C1C' },
  success: { backgroundColor: '#1056E0' },
  text: { color: '#fff', fontSize: 14 },
});
