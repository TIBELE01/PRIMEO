// CategoryCard: tappable category grid item on the Home screen
import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';

interface CategoryCardProps {
  icon: string;
  label: string;
  count?: number;
  onPress: () => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ icon, label, count, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <Text style={styles.icon}>{icon}</Text>
    <Text style={styles.label}>{label}</Text>
    {count !== undefined && <Text style={styles.count}>{count}</Text>}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: { backgroundColor: '#EFF5FF', borderRadius: 14, padding: 16, alignItems: 'center', flex: 1, margin: 6 },
  icon: { fontSize: 32, marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#1056E0', textAlign: 'center' },
  count: { fontSize: 11, color: '#777', marginTop: 4 },
});
