import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, Animated, Platform } from 'react-native';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
}

export function SearchBar({ value, onChangeText, placeholder = 'Rechercher...', onSubmit }: SearchBarProps) {
  const [focused, setFocused] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const nd = Platform.OS !== 'web';

  const onFocusHandler = () => {
    setFocused(true);
    Animated.spring(scale, { toValue: 1.01, speed: 50, bounciness: 2, useNativeDriver: nd }).start();
  };
  const onBlurHandler = () => {
    setFocused(false);
    Animated.spring(scale, { toValue: 1, speed: 50, bounciness: 2, useNativeDriver: nd }).start();
  };

  return (
    <Animated.View style={[styles.container, focused && styles.focused, { transform: [{ scale }] }]}>
      <Text style={[styles.icon, focused && styles.iconFocused]}>🔍</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        onFocus={onFocusHandler}
        onBlur={onBlurHandler}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')} style={styles.clearBtn} activeOpacity={0.7}>
          <Text style={styles.clear}>✕</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  focused: {
    backgroundColor: '#fff',
    borderColor: '#1056E0',
    shadowColor: '#1056E0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  icon: { fontSize: 16, marginRight: 10, opacity: 0.5 },
  iconFocused: { opacity: 1 },
  input: { flex: 1, fontSize: 15, color: '#0F1729' },
  clearBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clear: { fontSize: 11, color: '#475569', fontWeight: '700' },
});
