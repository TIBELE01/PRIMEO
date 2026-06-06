// AlertHost — hôte global des modales d'alerte. Monté une fois à la racine de
// l'application, il reçoit les configurations via `registerAlertListener` et
// affiche une modale stylée et professionnelle, identique sur web et natif.
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Platform, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  registerAlertListener, AlertConfig, AlertButton,
} from '../../utils/alertManager';

// Palette par ton — icône + couleur d'accent
const TONES = {
  info:    { icon: 'information-circle', color: '#1056E0', bg: '#EFF4FF' },
  success: { icon: 'checkmark-circle',   color: '#059669', bg: '#ECFDF5' },
  error:   { icon: 'close-circle',       color: '#DC2626', bg: '#FEF2F2' },
  warning: { icon: 'alert-circle',       color: '#D97706', bg: '#FFFBEB' },
} as const;

export function AlertHost() {
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  // Animation d'apparition
  const animateIn = useCallback(() => {
    opacity.setValue(0);
    scale.setValue(0.92);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(scale, { toValue: 1, duration: 200, easing: Easing.out(Easing.back(1.4)), useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [opacity, scale]);

  useEffect(() => {
    registerAlertListener((cfg) => {
      setConfig(cfg);
      setInputValue(cfg.promptDefaultValue ?? '');
      setVisible(true);
    });
    return () => registerAlertListener(null);
  }, []);

  useEffect(() => {
    if (visible) animateIn();
  }, [visible, animateIn]);

  const close = useCallback((onPress?: AlertButton['onPress'], isCancel = false) => {
    // Pour un prompt, on transmet la valeur saisie (sauf au bouton Annuler).
    const value = config?.prompt && !isCancel ? inputValue : undefined;
    Animated.timing(opacity, { toValue: 0, duration: 130, useNativeDriver: Platform.OS !== 'web' }).start(() => {
      setVisible(false);
      setConfig(null);
      onPress?.(value);
    });
  }, [opacity, config, inputValue]);

  if (!config) return null;

  const tone = TONES[config.tone ?? 'info'];
  const buttons: AlertButton[] = config.buttons && config.buttons.length > 0
    ? config.buttons
    : [{ text: 'OK', style: 'default' }];

  // Disposition : 2 boutons côte à côte, sinon empilés
  const sideBySide = buttons.length === 2;

  const renderButton = (btn: AlertButton, idx: number) => {
    const isCancel = btn.style === 'cancel';
    const isDestructive = btn.style === 'destructive';
    const isPrimary = !isCancel && !isDestructive;

    return (
      <TouchableOpacity
        key={idx}
        activeOpacity={0.8}
        onPress={() => close(btn.onPress, isCancel)}
        style={[
          s.btn,
          sideBySide && s.btnFlex,
          isCancel && s.btnCancel,
          isDestructive && s.btnDestructive,
          isPrimary && { backgroundColor: tone.color },
        ]}
      >
        <Text style={[
          s.btnText,
          isCancel && s.btnTextCancel,
          isDestructive && s.btnTextDestructive,
        ]}>
          {btn.text ?? 'OK'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => close()} statusBarTranslucent>
      <Animated.View style={[s.backdrop, { opacity }]}>
        <Animated.View style={[s.card, { transform: [{ scale }] }]}>
          {/* Icône de ton */}
          <View style={[s.iconWrap, { backgroundColor: tone.bg }]}>
            <Ionicons name={tone.icon as React.ComponentProps<typeof Ionicons>['name']} size={32} color={tone.color} />
          </View>

          {config.title ? <Text style={s.title}>{config.title}</Text> : null}
          {config.message ? <Text style={s.message}>{config.message}</Text> : null}

          {config.prompt ? (
            <TextInput
              style={s.input}
              value={inputValue}
              onChangeText={setInputValue}
              placeholder={config.promptPlaceholder ?? ''}
              placeholderTextColor="#94A3B8"
              autoFocus
              multiline
            />
          ) : null}

          <View style={[s.actions, sideBySide ? s.actionsRow : s.actionsCol]}>
            {buttons.map(renderButton)}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
    elevation: 16,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18, fontWeight: '800', color: '#0F172A',
    textAlign: 'center', marginBottom: 8,
  },
  message: {
    fontSize: 14.5, color: '#64748B', lineHeight: 21,
    textAlign: 'center', marginBottom: 4,
  },
  input: {
    width: '100%',
    marginTop: 16,
    minHeight: 48,
    maxHeight: 120,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14.5,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    textAlignVertical: 'top',
  },
  actions: { width: '100%', marginTop: 22, gap: 10 },
  actionsRow: { flexDirection: 'row' },
  actionsCol: { flexDirection: 'column' },

  btn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1056E0',
  },
  btnFlex: { flex: 1 },
  btnCancel: {
    backgroundColor: '#F1F5F9',
    borderWidth: 0,
  },
  btnDestructive: { backgroundColor: '#DC2626' },
  btnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  btnTextCancel: { color: '#475569' },
  btnTextDestructive: { color: '#fff' },
});
