// Champ de recherche avec autocomplétion Geoapify et géolocalisation.
// Filtre sur la Côte d'Ivoire par défaut (filter=countrycode:ci).
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform,
} from 'react-native';
import { useDebounce } from '@hooks/useDebounce';

const GEOAPIFY_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_KEY ?? '45a2f3027d5c444c91b3dd6c1cdd38cd';

interface Suggestion {
  id: string;
  label: string;
  city: string;
  lat: number;
  lon: number;
}

interface Props {
  value: string;
  onChange: (text: string) => void;
  onSelectCity: (city: string) => void;
  color?: string;
  placeholder?: string;
}

export function GeoSearchInput({
  value, onChange, onSelectCity,
  color = '#1056E0',
  placeholder = 'Ville ou destination…',
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSugg, setShowSugg] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const debounced = useDebounce(value, 350);

  useEffect(() => {
    if (!debounced || debounced.length < 2) { setSuggestions([]); return; }
    const url = [
      'https://api.geoapify.com/v1/geocode/autocomplete',
      `?text=${encodeURIComponent(debounced)}`,
      `&apiKey=${GEOAPIFY_KEY}`,
      '&lang=fr&limit=6&type=city',
    ].join('');
    fetch(url)
      .then(r => r.json())
      .then(json => {
        const items: Suggestion[] = (json.features ?? []).map((f: any) => ({
          id: f.properties.place_id ?? String(Math.random()),
          label: f.properties.formatted ?? '',
          city: f.properties.city ?? f.properties.county ?? f.properties.state ?? '',
          lat: f.properties.lat,
          lon: f.properties.lon,
        }));
        setSuggestions(items);
        setShowSugg(items.length > 0);
      })
      .catch(() => setSuggestions([]));
  }, [debounced]);

  const handleGeolocate = useCallback(async () => {
    setGeoLoading(true);
    const reverseGeocode = async (lat: number, lon: number) => {
      const r = await fetch(
        `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${GEOAPIFY_KEY}&lang=fr`,
      );
      const json = await r.json();
      const city = json.features?.[0]?.properties?.city ?? '';
      if (city) { onChange(city); onSelectCity(city); setShowSugg(false); }
    };
    try {
      if (Platform.OS === 'web') {
        navigator?.geolocation?.getCurrentPosition(
          async pos => {
            await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
            setGeoLoading(false);
          },
          () => setGeoLoading(false),
        );
      } else {
        const Location = require('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setGeoLoading(false); return; }
        const pos = await Location.getCurrentPositionAsync({});
        await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        setGeoLoading(false);
      }
    } catch { setGeoLoading(false); }
  }, [onChange, onSelectCity]);

  return (
    <View>
      <View style={gs.row}>
        <Text style={gs.icon}>📍</Text>
        <TextInput
          style={gs.input}
          value={value}
          onChangeText={t => { onChange(t); setShowSugg(true); }}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          returnKeyType="search"
          onSubmitEditing={() => setShowSugg(false)}
        />
        {value.length > 0 ? (
          <TouchableOpacity hitSlop={8} onPress={() => { onChange(''); setSuggestions([]); setShowSugg(false); }}>
            <Text style={gs.clear}>✕</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity hitSlop={8} onPress={handleGeolocate} disabled={geoLoading}>
            {geoLoading
              ? <ActivityIndicator size="small" color={color} />
              : <Text style={gs.geoIcon}>📡</Text>}
          </TouchableOpacity>
        )}
      </View>

      {showSugg && suggestions.length > 0 && (
        <View style={gs.suggestions}>
          {suggestions.map(sg => (
            <TouchableOpacity
              key={sg.id}
              style={gs.suggestion}
              onPress={() => {
                const city = sg.city || sg.label;
                onChange(city);
                onSelectCity(city);
                setShowSugg(false);
              }}
            >
              <Text style={gs.suggPin}>📍</Text>
              <View style={gs.suggInfo}>
                <Text style={gs.suggCity} numberOfLines={1}>{sg.city || sg.label}</Text>
                <Text style={gs.suggLabel} numberOfLines={1}>{sg.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const gs = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { fontSize: 17 },
  input: { flex: 1, fontSize: 15, color: '#111827', height: 38, padding: 0 },
  clear: { color: '#9CA3AF', fontSize: 15, paddingHorizontal: 4 },
  geoIcon: { fontSize: 17, paddingHorizontal: 4 },
  suggestions: {
    marginTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
    maxHeight: 240,
  },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 4 },
  suggPin: { fontSize: 15 },
  suggInfo: { flex: 1 },
  suggCity: { fontSize: 14, fontWeight: '600', color: '#111827' },
  suggLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
});
