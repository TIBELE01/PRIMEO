// Dynamic filter sheet driven by a CategoryConfig. Renders range / single / multi
// fields plus an optional availability date range, depending on the category.
import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, SafeAreaView,
} from 'react-native';
import type { CategoryConfig, FilterField } from './categoryConfig';

export type FilterState = Record<string, any>;

interface Props {
  visible: boolean;
  config: CategoryConfig;
  values: FilterState;
  onClose: () => void;
  onApply: (values: FilterState) => void;
  onReset: () => void;
}

export function CategoryFilterSheet({ visible, config, values, onClose, onApply, onReset }: Props) {
  const [draft, setDraft] = useState<FilterState>(values);

  useEffect(() => { if (visible) setDraft(values); }, [visible, values]);

  const setRange = (id: string, key: 'min' | 'max', v: string) =>
    setDraft(d => ({ ...d, [id]: { ...(d[id] ?? {}), [key]: v } }));

  const setSingle = (id: string, v: string) =>
    setDraft(d => ({ ...d, [id]: d[id] === v ? undefined : v }));

  const toggleMulti = (id: string, v: string) =>
    setDraft(d => {
      const arr: string[] = d[id] ?? [];
      const next = arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
      return { ...d, [id]: next.length ? next : undefined };
    });

  const setDate = (key: 'checkIn' | 'checkOut', v: string) =>
    setDraft(d => ({ ...d, [key]: v }));

  const activeCount = countActive(draft, config);

  const renderField = (f: FilterField) => {
    if (f.type === 'range') {
      const val = draft[f.id] ?? {};
      return (
        <View key={f.id} style={st.section}>
          <Text style={st.sectionTitle}>{f.icon} {f.label}</Text>
          <View style={st.priceRow}>
            <View style={st.priceField}>
              <Text style={st.priceLabel}>Minimum</Text>
              <TextInput style={st.input} value={val.min ?? ''} onChangeText={v => setRange(f.id, 'min', v)}
                keyboardType="numeric" placeholder={f.minPlaceholder ?? '0'} placeholderTextColor="#9CA3AF" />
            </View>
            <Text style={st.priceSep}>—</Text>
            <View style={st.priceField}>
              <Text style={st.priceLabel}>Maximum</Text>
              <TextInput style={st.input} value={val.max ?? ''} onChangeText={v => setRange(f.id, 'max', v)}
                keyboardType="numeric" placeholder={f.maxPlaceholder ?? 'Sans limite'} placeholderTextColor="#9CA3AF" />
            </View>
          </View>
        </View>
      );
    }
    if (f.type === 'single') {
      return (
        <View key={f.id} style={st.section}>
          <Text style={st.sectionTitle}>{f.icon} {f.label}</Text>
          <View style={st.chipGroup}>
            {f.options!.map(o => {
              const active = draft[f.id] === o.value;
              return (
                <TouchableOpacity key={o.value} style={[st.chip, active && { backgroundColor: config.color, borderColor: config.color }]}
                  onPress={() => setSingle(f.id, o.value)}>
                  <Text style={[st.chipText, active && st.chipTextActive]}>{o.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }
    // multi
    const sel: string[] = draft[f.id] ?? [];
    return (
      <View key={f.id} style={st.section}>
        <Text style={st.sectionTitle}>{f.icon} {f.label}</Text>
        <View style={st.chipGroup}>
          {f.options!.map(o => {
            const active = sel.includes(o.value);
            return (
              <TouchableOpacity key={o.value} style={[st.chip, active && { backgroundColor: config.color, borderColor: config.color }]}
                onPress={() => toggleMulti(f.id, o.value)}>
                <Text style={[st.chipText, active && st.chipTextActive]}>{o.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={st.safe}>
        <View style={st.header}>
          <TouchableOpacity onPress={onClose}><Text style={st.cancel}>Annuler</Text></TouchableOpacity>
          <Text style={st.title}>Filtres{activeCount > 0 ? ` (${activeCount})` : ''}</Text>
          <TouchableOpacity onPress={() => { setDraft({}); onReset(); }}><Text style={st.reset}>Réinitialiser</Text></TouchableOpacity>
        </View>

        <ScrollView style={st.body} contentContainerStyle={{ gap: 26, paddingBottom: 48 }}>
          {config.showDates && (
            <View style={st.section}>
              <Text style={st.sectionTitle}>📅 {config.dateLabel}</Text>
              <View style={st.priceRow}>
                <View style={st.priceField}>
                  <Text style={st.priceLabel}>{config.key === 'restaurant' ? 'Date' : 'Arrivée'}</Text>
                  <TextInput style={st.input} value={draft.checkIn ?? ''} onChangeText={v => setDate('checkIn', v)}
                    placeholder="AAAA-MM-JJ" placeholderTextColor="#9CA3AF" keyboardType="numbers-and-punctuation" />
                </View>
                {config.key !== 'restaurant' && (
                  <>
                    <Text style={st.priceSep}>—</Text>
                    <View style={st.priceField}>
                      <Text style={st.priceLabel}>Départ</Text>
                      <TextInput style={st.input} value={draft.checkOut ?? ''} onChangeText={v => setDate('checkOut', v)}
                        placeholder="AAAA-MM-JJ" placeholderTextColor="#9CA3AF" keyboardType="numbers-and-punctuation" />
                    </View>
                  </>
                )}
              </View>
            </View>
          )}

          {config.filters.map(renderField)}
        </ScrollView>

        <View style={st.footer}>
          <TouchableOpacity style={[st.applyBtn, { backgroundColor: config.color }]} onPress={() => onApply(draft)}>
            <Text style={st.applyBtnText}>Appliquer les filtres</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/* ── Count active filters (shared with the screen) ── */
export function countActive(state: FilterState, config: CategoryConfig): number {
  let n = 0;
  if (config.showDates && (state.checkIn || state.checkOut)) n += 1;
  for (const f of config.filters) {
    const v = state[f.id];
    if (v == null) continue;
    if (f.type === 'range') { if (v.min || v.max) n += 1; }
    else if (f.type === 'multi') { if (Array.isArray(v) && v.length) n += 1; }
    else if (v !== '') n += 1;
  }
  return n;
}

const st = StyleSheet.create({
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
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  chipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  footer: { padding: 16 },
  applyBtn: { borderRadius: 14, padding: 16, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
