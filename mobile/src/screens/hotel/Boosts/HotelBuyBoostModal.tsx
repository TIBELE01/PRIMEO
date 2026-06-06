import React from 'react'; import { View, Text, StyleSheet } from 'react-native';
export const HotelBuyBoostModal: React.FC<{ visible: boolean; onConfirm: () => void; onClose: () => void }> = ({ visible, onConfirm, onClose }) => visible ? (<View style={styles.c}><Text>HotelBuyBoostModal</Text></View>) : null;
const styles = StyleSheet.create({ c: { flex: 1 } });
