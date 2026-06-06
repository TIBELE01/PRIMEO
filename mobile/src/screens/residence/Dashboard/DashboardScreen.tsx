// ResidenceDashboardScreen: main dashboard for residence professionals
import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { KPICards } from './KPICards';
import { RevenueChart } from './RevenueChart';
import { OccupancyChart } from './OccupancyChart';
import { AlertsList } from './AlertsList';

export default function ResidenceDashboardScreen() {
  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.content}>
        <KPICards />
        <RevenueChart />
        <OccupancyChart />
        <AlertsList />
      </ScrollView>
    </ScreenWrapper>
  );
}
const styles = StyleSheet.create({ content: { padding: 16, gap: 16 } });
