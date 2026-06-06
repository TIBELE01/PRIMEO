// VirtualTourButton — CTA that launches the 3D panorama viewer.
// Only renders when the property has at least one panorama (available=true).
import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';

interface VirtualTourButtonProps {
  onPress: () => void;
  /** Pass true only when property.virtualTour?.available is true. */
  available?: boolean;
  /** Number of panoramas — shown as subtitle when > 1. */
  roomCount?: number;
}

export const VirtualTourButton: React.FC<VirtualTourButtonProps> = ({
  onPress,
  available = false,
  roomCount,
}) => {
  if (!available) return null;

  return (
    <TouchableOpacity style={styles.btn} onPress={onPress} activeOpacity={0.82}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>🔭</Text>
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>Visite virtuelle 3D</Text>
        {roomCount && roomCount > 1 ? (
          <Text style={styles.subtitle}>{roomCount} pièces à explorer</Text>
        ) : (
          <Text style={styles.subtitle}>Panorama 360° interactif</Text>
        )}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1056E0',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    shadowColor: '#1056E0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: { fontSize: 20 },
  textWrap: { flex: 1 },
  title: { color: '#fff', fontWeight: '700', fontSize: 15 },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  chevron: { color: 'rgba(255,255,255,0.6)', fontSize: 22, fontWeight: '300' },
});
