// BookingCalendarWidget: date range picker for check-in / check-out selection
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface BookingCalendarWidgetProps {
  unavailableDates?: string[];
  onRangeSelected: (checkIn: string, checkOut: string) => void;
}

export const BookingCalendarWidget: React.FC<BookingCalendarWidgetProps> = ({ unavailableDates = [], onRangeSelected }) => {
  // Placeholder: integrate react-native-calendars in full implementation
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Sélectionnez vos dates</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 20, alignItems: 'center' },
  placeholder: { color: '#999', fontSize: 14 },
});
