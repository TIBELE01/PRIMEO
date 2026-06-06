import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, SafeAreaView,
} from 'react-native';

export interface FilterValues {
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  amenities?: string[];
  rules?: string[];
  cuisineType?: string;
  maxDistance?: number;
  timeSlot?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  values: FilterValues;
  sectorType?: string;
  onApply: (values: FilterValues) => void;
  onReset: () => void;
}

const RATINGS = [3, 3.5, 4, 4.5];

const AMENITIES = [
  { key: 'wifi', label: '📶 Wi-Fi' },
  { key: 'parking', label: '🚗 Parking' },
  { key: 'pool', label: '🏊 Piscine' },
  { key: 'gym', label: '🏋️ Gym' },
  { key: 'ac', label: '❄️ Climatisation' },
  { key: 'kitchen', label: '🍳 Cuisine équipée' },
  { key: 'tv', label: '📺 TV' },
  { key: 'security', label: '🔒 Gardiennage' },
  { key: 'generator', label: '⚡ Groupe électrogène' },
  { key: 'balcony', label: '🏗️ Balcon / Terrasse' },
];

const RULES = [
  { key: 'no_smoking', label: '🚭 Non-fumeur' },
  { key: 'no_pets', label: '🐾 Pas d\'animaux' },
  { key: 'no_parties', label: '🎉 Pas de fêtes' },
  { key: 'instant_book', label: '⚡ Réservation instantanée' },
  { key: 'flexible_cancel', label: '↩ Annulation flexible' },
];

const CUISINE_TYPES = [
  'Africaine', 'Ivoirienne', 'Libanaise', 'Française',
  'Italienne', 'Asiatique', 'Américaine', 'Fast-food', 'Végétarienne',
];

const TIME_SLOTS = ['12:00-13:30', '19:30-21:00', '20:00-22:00', '13:00-14:30', '21:00-23:00'];

const DISTANCES = [
  { label: '< 1 km', value: 1 },
  { label: '< 5 km', value: 5 },
  { label: '< 10 km', value: 10 },
  { label: '< 25 km', value: 25 },
];

function ChipGroup<T extends string>({
  items, selected, onToggle, multiple = true,
}: {
  items: { key: T; label: string }[];
  selected: T[];
  onToggle: (key: T) => void;
  multiple?: boolean;
}) {
  return (
    <View style={fs.chipGroup}>
      {items.map(item => {
        const active = selected.includes(item.key);
        return (
          <TouchableOpacity
            key={item.key}
            style={[fs.chip, active && fs.chipActive]}
            onPress={() => onToggle(item.key)}
          >
            <Text style={[fs.chipText, active && fs.chipTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function FilterSheet({ visible, onClose, values, sectorType, onApply, onReset }: Props) {
  const [minPrice, setMinPrice]     = useState('');
  const [maxPrice, setMaxPrice]     = useState('');
  const [minRating, setMinRating]   = useState<number | undefined>();
  const [amenities, setAmenities]   = useState<string[]>([]);
  const [rules, setRules]           = useState<string[]>([]);
  const [cuisineType, setCuisine]   = useState('');
  const [maxDistance, setDistance]  = useState<number | undefined>();
  const [timeSlot, setTimeSlot]     = useState<string | undefined>();

  useEffect(() => {
    if (visible) {
      setMinPrice(values.minPrice ? String(values.minPrice) : '');
      setMaxPrice(values.maxPrice ? String(values.maxPrice) : '');
      setMinRating(values.minRating);
      setAmenities(values.amenities ?? []);
      setRules(values.rules ?? []);
      setCuisine(values.cuisineType ?? '');
      setDistance(values.maxDistance);
      setTimeSlot(values.timeSlot);
    }
  }, [visible, values]);

  const toggleAmenity = (key: string) =>
    setAmenities(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const toggleRule = (key: string) =>
    setRules(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const activeCount = [minPrice, maxPrice, minRating, amenities.length > 0 || undefined, rules.length > 0 || undefined, cuisineType, maxDistance, timeSlot].filter(Boolean).length;

  const handleApply = () => onApply({
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    minRating,
    amenities: amenities.length > 0 ? amenities : undefined,
    rules: rules.length > 0 ? rules : undefined,
    cuisineType: cuisineType || undefined,
    maxDistance,
    timeSlot,
  });

  const isRestaurant = sectorType === 'restaurant';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={fs.safe}>
        <View style={fs.header}>
          <TouchableOpacity onPress={onClose}><Text style={fs.cancel}>Annuler</Text></TouchableOpacity>
          <Text style={fs.title}>Filtres{activeCount > 0 ? ` (${activeCount})` : ''}</Text>
          <TouchableOpacity onPress={onReset}><Text style={fs.reset}>Réinitialiser</Text></TouchableOpacity>
        </View>

        <ScrollView style={fs.body} contentContainerStyle={{ gap: 28, paddingBottom: 48 }}>

          {/* Price */}
          <View style={fs.section}>
            <Text style={fs.sectionTitle}>💰 Fourchette de prix (FCFA / nuit)</Text>
            <View style={fs.priceRow}>
              <View style={fs.priceField}>
                <Text style={fs.priceLabel}>Minimum</Text>
                <TextInput style={fs.input} value={minPrice} onChangeText={setMinPrice}
                  keyboardType="numeric" placeholder="0" placeholderTextColor="#9CA3AF" />
              </View>
              <Text style={fs.priceSep}>—</Text>
              <View style={fs.priceField}>
                <Text style={fs.priceLabel}>Maximum</Text>
                <TextInput style={fs.input} value={maxPrice} onChangeText={setMaxPrice}
                  keyboardType="numeric" placeholder="Sans limite" placeholderTextColor="#9CA3AF" />
              </View>
            </View>
          </View>

          {/* Rating */}
          <View style={fs.section}>
            <Text style={fs.sectionTitle}>⭐ Note minimale</Text>
            <View style={fs.ratingRow}>
              {RATINGS.map(r => (
                <TouchableOpacity
                  key={r}
                  style={[fs.ratingChip, minRating === r && fs.ratingChipActive]}
                  onPress={() => setMinRating(minRating === r ? undefined : r)}
                >
                  <Text style={[fs.ratingChipText, minRating === r && fs.ratingChipTextActive]}>★ {r}+</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Distance */}
          <View style={fs.section}>
            <Text style={fs.sectionTitle}>📍 Distance maximale</Text>
            <View style={fs.ratingRow}>
              {DISTANCES.map(d => (
                <TouchableOpacity
                  key={d.value}
                  style={[fs.ratingChip, maxDistance === d.value && fs.ratingChipActive]}
                  onPress={() => setDistance(maxDistance === d.value ? undefined : d.value)}
                >
                  <Text style={[fs.ratingChipText, maxDistance === d.value && fs.ratingChipTextActive]}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Amenities */}
          {!isRestaurant && (
            <View style={fs.section}>
              <Text style={fs.sectionTitle}>🛎️ Équipements</Text>
              <ChipGroup
                items={AMENITIES as any}
                selected={amenities}
                onToggle={toggleAmenity}
              />
            </View>
          )}

          {/* Rules */}
          {!isRestaurant && (
            <View style={fs.section}>
              <Text style={fs.sectionTitle}>📋 Règles & options</Text>
              <ChipGroup
                items={RULES as any}
                selected={rules}
                onToggle={toggleRule}
              />
            </View>
          )}

          {/* Cuisine type (restaurants only) */}
          {isRestaurant && (
            <View style={fs.section}>
              <Text style={fs.sectionTitle}>🍽️ Type de cuisine</Text>
              <View style={fs.chipGroup}>
                {CUISINE_TYPES.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[fs.chip, cuisineType === c && fs.chipActive]}
                    onPress={() => setCuisine(cuisineType === c ? '' : c)}
                  >
                    <Text style={[fs.chipText, cuisineType === c && fs.chipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Time slots (restaurants only) */}
          {isRestaurant && (
            <View style={fs.section}>
              <Text style={fs.sectionTitle}>🕐 Créneaux disponibles</Text>
              <View style={fs.chipGroup}>
                {TIME_SLOTS.map(slot => (
                  <TouchableOpacity
                    key={slot}
                    style={[fs.chip, timeSlot === slot && fs.chipActive]}
                    onPress={() => setTimeSlot(timeSlot === slot ? undefined : slot)}
                  >
                    <Text style={[fs.chipText, timeSlot === slot && fs.chipTextActive]}>{slot}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

        </ScrollView>

        <View style={fs.footer}>
          <TouchableOpacity style={fs.applyBtn} onPress={handleApply}>
            <Text style={fs.applyBtnText}>Appliquer les filtres</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const fs = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  cancel: { fontSize: 15, color: '#6B7280' },
  title: { fontSize: 16, fontWeight: '700', color: '#111827' },
  reset: { fontSize: 15, color: '#DC2626' },
  body: { flex: 1, padding: 16 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priceField: { flex: 1, gap: 4 },
  priceLabel: { fontSize: 12, color: '#6B7280' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 10, fontSize: 14, color: '#111827' },
  priceSep: { fontSize: 18, color: '#9CA3AF' },
  ratingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ratingChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  ratingChipActive: { backgroundColor: '#1056E0', borderColor: '#1056E0' },
  ratingChipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  ratingChipTextActive: { color: '#fff' },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#1B5E20', borderColor: '#1B5E20' },
  chipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  footer: { padding: 16 },
  applyBtn: { backgroundColor: '#1056E0', borderRadius: 14, padding: 16, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
