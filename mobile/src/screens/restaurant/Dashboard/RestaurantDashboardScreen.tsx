import React from 'react'; import { ScrollView, StyleSheet } from 'react-native'; import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { RestaurantKPIs } from './RestaurantKPIs'; import { BookingStats } from './BookingStats';
export default function RestaurantDashboardScreen() { return (<ScreenWrapper><ScrollView contentContainerStyle={styles.c}><RestaurantKPIs /><BookingStats /></ScrollView></ScreenWrapper>); }
const styles = StyleSheet.create({ c: { padding: 16, gap: 16 } });
