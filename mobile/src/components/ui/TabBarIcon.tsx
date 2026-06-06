// TabBarIcon: icon component for bottom tab navigator tabs
import React from 'react';
import { Text } from 'react-native';

interface TabBarIconProps {
  focused: boolean;
  icon: string;
  size?: number;
}

export const TabBarIcon: React.FC<TabBarIconProps> = ({ focused, icon, size = 24 }) => (
  <Text style={{ fontSize: size, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
);
