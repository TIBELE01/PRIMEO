import React from 'react';
import { View, ScrollView, StyleSheet, ViewStyle, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenWrapperProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  onRefresh?: () => void;
  refreshing?: boolean;
  backgroundColor?: string;
  /** Extra horizontal padding on top of the default 16px. Pass 0 to remove. */
  paddingHorizontal?: number;
  /** Extra padding at the top (under safe area). */
  paddingTop?: number;
  /** Extra padding at the bottom (above safe area). */
  paddingBottom?: number;
}

export function ScreenWrapper({
  children,
  scrollable,
  style,
  contentStyle,
  onRefresh,
  refreshing,
  backgroundColor = '#F5F5F5',
  paddingHorizontal = 16,
  paddingTop = 16,
  paddingBottom = 80,
}: ScreenWrapperProps) {
  const safeStyle = [styles.safe, { backgroundColor }];

  if (scrollable) {
    return (
      <SafeAreaView style={safeStyle}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal,
              paddingTop,
              paddingBottom,
            },
            contentStyle,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing ?? false}
                onRefresh={onRefresh}
                tintColor="#1056E0"
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={safeStyle}>
      <View
        style={[
          styles.container,
          {
            paddingHorizontal,
            paddingTop,
          },
          style,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  container:     { flex: 1 },
  scroll:        { flex: 1 },
  scrollContent: { flexGrow: 1 },
});
