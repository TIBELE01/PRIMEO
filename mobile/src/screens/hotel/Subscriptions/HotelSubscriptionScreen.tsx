import React from 'react'; import { View, Text, StyleSheet } from 'react-native'; import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
export default function HotelSubscriptionScreen() { return (<ScreenWrapper><View style={styles.c}><Text style={styles.t}>HotelSubscriptionScreen</Text></View></ScreenWrapper>); }
const styles = StyleSheet.create({ c: { flex: 1, justifyContent: 'center', alignItems: 'center' }, t: { color: '#999' } });
