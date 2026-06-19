// Éditeur de visite 3D — renomme les pièces et définit les hotspots de
// navigation inter-pièces. Chaque hotspot pointe vers une autre pièce, avec un
// libellé et une direction (cap horizontal en degrés → theta ; horizon par défaut).
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity,
  TextInput, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { propertiesApi } from '../../../services/api/endpoints/properties';

interface Hotspot { id?: string; targetSceneId: string; label: string; theta: number; phi: number }
interface Scene { id: string; roomName: string; url: string; hotspots?: Hotspot[] }

const TWO_PI = Math.PI * 2;
const degFromTheta = (theta: number) => Math.round(((theta % TWO_PI) + TWO_PI) % TWO_PI * 180 / Math.PI);
const thetaFromDeg = (deg: number) => ((deg % 360) + 360) % 360 * Math.PI / 180;
const HORIZON = Math.PI / 2;

export default function Scene3dEditorScreen({ route }: any) {
  const propertyId: string = route?.params?.propertyId;
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  // édition locale par scène : roomName + hotspots
  const [draft, setDraft] = useState<Record<string, { roomName: string; hotspots: Hotspot[] }>>({});

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await propertiesApi.list3dScenes(propertyId);
      const list: Scene[] = res.data?.data ?? res.data ?? [];
      setScenes(list);
      const d: Record<string, { roomName: string; hotspots: Hotspot[] }> = {};
      for (const s of list) d[s.id] = { roomName: s.roomName, hotspots: Array.isArray(s.hotspots) ? s.hotspots : [] };
      setDraft(d);
    } catch { /* garde l'état */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [propertyId]);

  useEffect(() => { load(); }, [load]);

  const others = (sceneId: string) => scenes.filter(s => s.id !== sceneId);

  const addHotspot = (sceneId: string) => {
    const targets = others(sceneId);
    if (targets.length === 0) { Alert.alert('Aucune autre pièce', 'Ajoutez au moins une autre photo 360° pour créer un lien.'); return; }
    setDraft(d => ({ ...d, [sceneId]: { ...d[sceneId], hotspots: [...d[sceneId].hotspots, { targetSceneId: targets[0].id, label: '', theta: 0, phi: HORIZON }] } }));
  };

  const updateHotspot = (sceneId: string, i: number, patch: Partial<Hotspot>) => {
    setDraft(d => {
      const hs = d[sceneId].hotspots.slice();
      hs[i] = { ...hs[i], ...patch };
      return { ...d, [sceneId]: { ...d[sceneId], hotspots: hs } };
    });
  };

  const removeHotspot = (sceneId: string, i: number) => {
    setDraft(d => ({ ...d, [sceneId]: { ...d[sceneId], hotspots: d[sceneId].hotspots.filter((_, idx) => idx !== i) } }));
  };

  const save = async (sceneId: string) => {
    const d = draft[sceneId];
    if (!d) return;
    setSavingId(sceneId);
    try {
      await propertiesApi.updateScene3d(propertyId, sceneId, {
        roomName: d.roomName,
        hotspots: d.hotspots.map(h => ({ targetSceneId: h.targetSceneId, label: h.label, theta: h.theta, phi: h.phi ?? HORIZON })),
      });
      Alert.alert('Enregistré', 'La pièce et ses liens ont été mis à jour.');
      await load(true);
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.error ?? 'Enregistrement impossible.');
    } finally {
      setSavingId(null);
    }
  };

  const roomName = (id: string) => scenes.find(s => s.id === id)?.roomName ?? 'Pièce';

  if (loading) {
    return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator size="large" color="#1056E0" /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#1056E0" />}>
        <Text style={s.title}>Visite 3D & navigation</Text>
        <Text style={s.subtitle}>{scenes.length} pièce(s). Ajoutez des liens pour passer d'une pièce à l'autre dans la visite.</Text>

        {scenes.length === 0 && (
          <View style={s.empty}><Ionicons name="cube-outline" size={40} color="#9CA3AF" /><Text style={s.emptyText}>Aucune photo 360°. Ajoutez-en depuis l'édition de l'annonce.</Text></View>
        )}

        {scenes.map((scene) => {
          const d = draft[scene.id] ?? { roomName: scene.roomName, hotspots: [] };
          return (
            <View key={scene.id} style={s.card}>
              <Text style={s.cardLabel}>Nom de la pièce</Text>
              <TextInput
                style={s.input}
                value={d.roomName}
                onChangeText={(t) => setDraft(prev => ({ ...prev, [scene.id]: { ...prev[scene.id], roomName: t } }))}
                placeholder="Salon, Chambre…"
              />

              <Text style={[s.cardLabel, { marginTop: 14 }]}>Liens vers d'autres pièces ({d.hotspots.length})</Text>
              {d.hotspots.map((h, i) => (
                <View key={i} style={s.hotspot}>
                  <View style={s.hotspotHeader}>
                    <Text style={s.hotspotTitle}>Lien {i + 1}</Text>
                    <TouchableOpacity onPress={() => removeHotspot(scene.id, i)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color="#DC2626" />
                    </TouchableOpacity>
                  </View>

                  {/* Pièce cible — chips */}
                  <Text style={s.fieldLabel}>Aller vers</Text>
                  <View style={s.chips}>
                    {others(scene.id).map(o => (
                      <TouchableOpacity
                        key={o.id}
                        style={[s.chip, h.targetSceneId === o.id && s.chipActive]}
                        onPress={() => updateHotspot(scene.id, i, { targetSceneId: o.id })}
                      >
                        <Text style={[s.chipText, h.targetSceneId === o.id && s.chipTextActive]}>{o.roomName}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={s.fieldLabel}>Libellé (optionnel)</Text>
                  <TextInput
                    style={s.input}
                    value={h.label}
                    onChangeText={(t) => updateHotspot(scene.id, i, { label: t })}
                    placeholder={`Vers ${roomName(h.targetSceneId)}`}
                  />

                  {/* Direction (cap horizontal en degrés) */}
                  <Text style={s.fieldLabel}>Direction : {degFromTheta(h.theta)}°</Text>
                  <View style={s.dirRow}>
                    <TouchableOpacity style={s.dirBtn} onPress={() => updateHotspot(scene.id, i, { theta: thetaFromDeg(degFromTheta(h.theta) - 15) })}>
                      <Ionicons name="arrow-back" size={18} color="#1056E0" />
                    </TouchableOpacity>
                    <View style={s.dirTrack}><View style={[s.dirFill, { width: `${(degFromTheta(h.theta) / 360) * 100}%` }]} /></View>
                    <TouchableOpacity style={s.dirBtn} onPress={() => updateHotspot(scene.id, i, { theta: thetaFromDeg(degFromTheta(h.theta) + 15) })}>
                      <Ionicons name="arrow-forward" size={18} color="#1056E0" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TouchableOpacity style={s.addLink} onPress={() => addHotspot(scene.id)}>
                <Ionicons name="add-circle-outline" size={18} color="#1056E0" />
                <Text style={s.addLinkText}>Ajouter un lien</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[s.saveBtn, savingId === scene.id && s.btnDisabled]} onPress={() => save(scene.id)} disabled={savingId === scene.id}>
                {savingId === scene.id ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Enregistrer cette pièce</Text>}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, paddingTop: 16, backgroundColor: '#F4F6FB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2, marginBottom: 14 },
  empty: { alignItems: 'center', padding: 30, gap: 10 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  cardLabel: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827' },
  hotspot: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#EEF0F3' },
  hotspotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  hotspotTitle: { fontSize: 13, fontWeight: '700', color: '#374151' },
  fieldLabel: { fontSize: 12, color: '#6B7280', marginTop: 10, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  chipActive: { borderColor: '#1056E0', backgroundColor: '#EFF6FF' },
  chipText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  chipTextActive: { color: '#1056E0' },
  dirRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dirBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  dirTrack: { flex: 1, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  dirFill: { height: 6, backgroundColor: '#1056E0' },
  addLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingVertical: 8 },
  addLinkText: { color: '#1056E0', fontWeight: '700', fontSize: 14 },
  saveBtn: { backgroundColor: '#1056E0', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.5 },
});
