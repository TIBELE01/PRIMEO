import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { HotelKPICards } from './HotelKPICards';
import { HotelRevenueChart } from './HotelRevenueChart';
import { HotelAlertsList } from './HotelAlertsList';

export default function HotelDashboardScreen() {
  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.content}>
        <HotelKPICards />
        <HotelRevenueChart />
        <HotelAlertsList />
      </ScrollView>
    </ScreenWrapper>
  );
}
const styles = StyleSheet.create({ content: { padding: 16, gap: 16 } });
