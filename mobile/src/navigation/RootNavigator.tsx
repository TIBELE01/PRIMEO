// Root navigator — session restore gate → Auth or Main tabs
import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/ThemeProvider';
import { PublicTabs } from './PublicTabs';
import { MainTabs }   from './MainTabs';

// A single stack at the root of the tree.  React Navigation conditionally
// renders either the authenticated or unauthenticated screen within the same
// navigator instance — this is the recommended auth-flow pattern from the
// React Navigation v6 docs and avoids state-management issues that arise
// when swapping bare navigator components.
const RootStack = createNativeStackNavigator();

export function RootNavigator() {
  const { theme } = useTheme();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user       = useAuthStore((s) => s.user);

  // Show a splash until the silent session-restore attempt finishes.
  if (!isHydrated) {
    return (
      <View style={[styles.splash, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false, animation: 'none' }}>
      {user ? (
        <RootStack.Screen name="MainTabs" component={MainTabs} />
      ) : (
        <RootStack.Screen name="PublicTabs" component={PublicTabs} />
      )}
    </RootStack.Navigator>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
