// ResidenceMessagesScreen: conversation list for residence professionals
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function ResidenceMessagesScreen() {
  return <ScreenWrapper><EmptyState icon="💬" title="Messagerie" subtitle="Vos conversations apparaîtront ici" /></ScreenWrapper>;
}
