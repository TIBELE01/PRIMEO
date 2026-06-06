import React from 'react'; import { ScrollView, StyleSheet } from 'react-native'; import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { ImmobilierKPICards } from './ImmobilierKPICards'; import { ImmobilierRevenueChart } from './ImmobilierRevenueChart'; import { ImmobilierAlertsList } from './ImmobilierAlertsList';
export default function ImmobilierDashboardScreen() { return (<ScreenWrapper><ScrollView contentContainerStyle={styles.content}><ImmobilierKPICards /><ImmobilierRevenueChart /><ImmobilierAlertsList /></ScrollView></ScreenWrapper>); }
const styles = StyleSheet.create({ content: { padding: 16, gap: 16 } });
