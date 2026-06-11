import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Switch, Image, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { propertiesApi } from '../../../services/api/endpoints/properties';
import { subscriptionsApi } from '../../../services/api/endpoints/subscriptions';
import { availabilitiesApi } from '../../../services/api/endpoints/availabilities';
import { uploadPropertyMedia } from '../../../services/mediaUpload';
import { useProTheme } from '../../../hooks/useProTheme';
import { useAuthStore } from '../../../store/authStore';

// Déduit le type de bien unique imposé par le rôle du professionnel.
// Renvoie undefined pour les cas multi-types (immobilier) ou inconnus.
function getLockedTypeForRole(role?: string): string | undefined {
  if (role === 'restaurateur')           return 'restaurant';
  if (role === 'professional_hotel')     return 'hotel';
  if (role === 'professional_hebergement') return 'residence';
  return undefined; // professional_immobilier : plusieurs types possibles
}

// Filtre les types de biens affichables selon le rôle
function getAllowedTypes(role?: string): readonly string[] {
  if (role === 'restaurateur')             return ['restaurant'];
  if (role === 'professional_hotel')       return ['hotel'];
  if (role === 'professional_hebergement') return ['residence'];
  if (role === 'professional_immobilier')  return ['immobilier_location', 'immobilier_terrain', 'immobilier_achat'];
  return PROPERTY_TYPES;
}


const STEPS_RESIDENCE  = ['Informations', 'Caractéristiques', 'Équipements', 'Médias', 'Tarification', 'Disponibilités', 'Règles'] as const;
const STEPS_HOTEL      = ['Informations', 'Caractéristiques', 'Types de chambre', 'Équipements', 'Médias', 'Disponibilités', 'Règles'] as const;
const STEPS_IMMOBILIER = ['Informations', 'Caractéristiques', 'Équipements', 'Médias', 'Tarification', 'Documents'] as const;
const STEPS_RESTAURANT = ['Informations', 'Configuration', 'Photos'] as const;

function getSteps(type?: string): readonly string[] {
  if (type === 'hotel')          return STEPS_HOTEL;
  if (isRealEstate(type))        return STEPS_IMMOBILIER;
  if (type === 'restaurant')     return STEPS_RESTAURANT;
  return STEPS_RESIDENCE;
}

// ── Helpers de type ───────────────────────────────────────────────────────────

function isLodging(type?: string)    { return type === 'residence' || type === 'hotel'; }
function isRealEstate(type?: string) { return (type ?? '').startsWith('immobilier'); }
function isRestaurant(type?: string) { return type === 'restaurant'; }

// ── Types internes ────────────────────────────────────────────────────────────

interface RoomType {
  id: string;
  label: string;
  pricePerNight: number;
  capacity: number;
  beds: number;
}

// ── Composants UI réutilisables ───────────────────────────────────────────────

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={styles.fieldLabel}>
      {label}{required && <Text style={{ color: '#DC2626' }}> *</Text>}
    </Text>
  );
}

function TextField({ label, value, onChange, placeholder, multiline, keyboardType, required, error, hint }: any) {
  return (
    <View style={styles.field}>
      <FieldLabel label={label} required={required} />
      {hint && <Text style={styles.fieldHint}>{hint}</Text>}
      <TextInput
        style={[styles.input, multiline && styles.inputMulti, error && styles.inputError]}
        value={value ?? ''}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        keyboardType={keyboardType ?? 'default'}
      />
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

function Counter({ label, value, onChange, min = 0, max = 99 }: any) {
  return (
    <View style={styles.counterRow}>
      <Text style={styles.counterLabel}>{label}</Text>
      <View style={styles.counterCtrl}>
        <TouchableOpacity style={styles.counterBtn} onPress={() => onChange(Math.max(min, (value ?? 0) - 1))}>
          <Text style={styles.counterBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.counterVal}>{value ?? 0}</Text>
        <TouchableOpacity style={styles.counterBtn} onPress={() => onChange(Math.min(max, (value ?? 0) + 1))}>
          <Text style={styles.counterBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ToggleRow({ label, value, onChange }: any) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={!!value}
        onValueChange={onChange}
        trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
        thumbColor={value ? '#1056E0' : '#9CA3AF'}
      />
    </View>
  );
}

// ── Types de biens — alignés avec le enum Prisma PropertyType ─────────────────

const PROPERTY_TYPES = [
  'residence',
  'hotel',
  'immobilier_location',
  'immobilier_terrain',
  'immobilier_achat',
  'restaurant',
] as const;

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  residence:           'Résidence / Appart / Villa',
  hotel:               'Hôtel',
  immobilier_location: 'Immobilier — Location',
  immobilier_terrain:  'Terrain',
  immobilier_achat:    'Immobilier — Vente',
  restaurant:          'Restaurant',
};

// ── Étape 1 — Informations (universel) ───────────────────────────────────────

function StepInformations({ data, onChange, errors, allowedTypes }: any) {
  const allowed: readonly string[] = allowedTypes ?? PROPERTY_TYPES;
  const typeLocked = allowed.length === 1;

  return (
    <View>
      <TextField
        label="Nom de l'annonce" required
        value={data.name}
        onChange={(v: string) => onChange('name', v)}
        placeholder={isRestaurant(data.type) ? 'Ex: Restaurant La Savane' : 'Ex: Belle villa avec piscine à Cocody'}
        error={errors.name}
      />

      {/* Sélecteur de type — masqué si le type est verrouillé par le rôle */}
      {!typeLocked && (
        <View style={styles.field}>
          <FieldLabel label="Type de bien" required />
          <View style={styles.chipRow}>
            {allowed.map((t: string) => (
              <TouchableOpacity
                key={t}
                style={[styles.chip, data.type === t && styles.chipActive]}
                onPress={() => onChange('type', t)}
              >
                <Text style={[styles.chipText, data.type === t && styles.chipTextActive]}>
                  {PROPERTY_TYPE_LABELS[t]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.type && <Text style={styles.fieldError}>{errors.type}</Text>}
        </View>
      )}

      <TextField
        label="Description" required multiline
        value={data.description}
        onChange={(v: string) => onChange('description', v)}
        placeholder={
          isRestaurant(data.type)
            ? 'Décrivez votre restaurant, son ambiance, ses spécialités…'
            : 'Décrivez votre bien en détail (min. 10 caractères)…'
        }
        error={errors.description}
      />
      {isRestaurant(data.type) && (
        <TextField
          label="Type de cuisine" required
          value={data.cuisineType}
          onChange={(v: string) => onChange('cuisineType', v)}
          placeholder="Ex: Africaine, Ivoirienne, Française, Seafood…"
          error={errors.cuisineType}
        />
      )}
      <TextField
        label="Ville" required
        value={data.city}
        onChange={(v: string) => onChange('city', v)}
        placeholder="Ex: Abidjan"
        error={errors.city}
      />
      <TextField
        label="Adresse complète" required
        value={data.street}
        onChange={(v: string) => onChange('street', v)}
        placeholder="Rue, quartier, commune…"
        error={errors.street}
      />
      <TextField
        label="Pays"
        value={data.country}
        onChange={(v: string) => onChange('country', v)}
        placeholder="Côte d'Ivoire"
      />
    </View>
  );
}

// ── Étape — Caractéristiques (adapté par type) ───────────────────────────────

function StepCaracteristiques({ data, onChange }: any) {
  const type: string = data.type ?? '';
  const isTerrain = type === 'immobilier_terrain';

  if (isRealEstate(type)) {
    return (
      <View>
        {!isTerrain && <Counter label="Nombre de pièces" value={data.rooms ?? 3} onChange={(v: number) => onChange('rooms', v)} min={1} max={50} />}
        {!isTerrain && <Counter label="Salles de bain"   value={data.bathrooms} onChange={(v: number) => onChange('bathrooms', v)} min={0} max={20} />}
        <TextField
          label="Surface (m²)" required keyboardType="numeric"
          value={data.surface ? String(data.surface) : ''}
          onChange={(v: string) => onChange('surface', Number(v) || undefined)}
          placeholder="Ex: 120"
        />
        {!isTerrain && (
          <TextField
            label="Étage" keyboardType="numeric"
            value={data.floor != null ? String(data.floor) : ''}
            onChange={(v: string) => onChange('floor', v === '' ? undefined : Number(v))}
            hint="0 = rez-de-chaussée"
            placeholder="Ex: 3"
          />
        )}
        {!isTerrain && (
          <TextField
            label="Année de construction" keyboardType="numeric"
            value={data.yearBuilt ? String(data.yearBuilt) : ''}
            onChange={(v: string) => onChange('yearBuilt', Number(v) || undefined)}
            placeholder="Ex: 2005"
          />
        )}
      </View>
    );
  }

  if (type === 'hotel') {
    return (
      <View>
        <Counter label="Capacité totale (personnes)" value={data.capacity ?? 50} onChange={(v: number) => onChange('capacity', v)} min={1} max={2000} />
        <TextField
          label="Surface totale (m²)" keyboardType="numeric"
          value={data.surface ? String(data.surface) : ''}
          onChange={(v: string) => onChange('surface', Number(v) || undefined)}
          placeholder="Ex: 2500"
          hint="Les types de chambres et leurs tarifs sont définis à l'étape suivante."
        />
      </View>
    );
  }

  // Restaurant : pas de champ Caractéristiques (géré dans Configuration)
  if (type === 'restaurant') return null;

  // Résidence (default)
  return (
    <View>
      <Counter label="Chambres"       value={data.bedrooms}  onChange={(v: number) => onChange('bedrooms', v)}  min={0} max={20}  />
      <Counter label="Lits"           value={data.beds}      onChange={(v: number) => onChange('beds', v)}      min={0} max={50}  />
      <Counter label="Salles de bain" value={data.bathrooms} onChange={(v: number) => onChange('bathrooms', v)} min={0} max={20}  />
      <Counter label="Capacité max."  value={data.capacity}  onChange={(v: number) => onChange('capacity', v)}  min={1} max={500} />
      <TextField
        label="Surface (m²)" keyboardType="numeric"
        value={data.surface ? String(data.surface) : ''}
        onChange={(v: string) => onChange('surface', Number(v) || undefined)}
        placeholder="Ex: 120"
      />
      <TextField
        label="Étage" keyboardType="numeric"
        value={data.floor != null ? String(data.floor) : ''}
        onChange={(v: string) => onChange('floor', v === '' ? undefined : Number(v))}
        placeholder="0 = rez-de-chaussée"
      />
    </View>
  );
}

// ── Étape — Types de chambres (hôtel uniquement) ─────────────────────────────

const ROOM_TYPE_PRESETS = ['Standard', 'Supérieure', 'Deluxe', 'Suite', 'Junior Suite', 'Chambre double', 'Chambre simple'];

function StepTypesChambres({ data, onChange, errors }: any) {
  const roomTypes: RoomType[] = data.roomTypes ?? [];
  const [modalVisible, setModalVisible]   = useState(false);
  const [editingIndex, setEditingIndex]   = useState<number | null>(null);
  const [formLabel, setFormLabel]         = useState('Standard');
  const [formPrice, setFormPrice]         = useState('');
  const [formCapacity, setFormCapacity]   = useState(2);
  const [formBeds, setFormBeds]           = useState(1);
  const [formError, setFormError]         = useState('');

  const openCreate = () => {
    setEditingIndex(null);
    setFormLabel('Standard');
    setFormPrice('');
    setFormCapacity(2);
    setFormBeds(1);
    setFormError('');
    setModalVisible(true);
  };

  const openEdit = (index: number) => {
    const rt = roomTypes[index];
    setEditingIndex(index);
    setFormLabel(rt.label);
    setFormPrice(String(rt.pricePerNight));
    setFormCapacity(rt.capacity);
    setFormBeds(rt.beds);
    setFormError('');
    setModalVisible(true);
  };

  const handleSave = () => {
    const price = parseInt(formPrice, 10);
    if (!formLabel.trim())        { setFormError('Le nom du type est requis.'); return; }
    if (isNaN(price) || price <= 0) { setFormError('Prix invalide.'); return; }
    const entry: RoomType = {
      id: editingIndex !== null ? roomTypes[editingIndex].id : `rt_${Date.now()}`,
      label: formLabel.trim(),
      pricePerNight: price,
      capacity: formCapacity,
      beds: formBeds,
    };
    if (editingIndex !== null) {
      const updated = [...roomTypes];
      updated[editingIndex] = entry;
      onChange('roomTypes', updated);
    } else {
      onChange('roomTypes', [...roomTypes, entry]);
    }
    setModalVisible(false);
  };

  const handleDelete = (index: number) => {
    onChange('roomTypes', roomTypes.filter((_: any, i: number) => i !== index));
  };

  return (
    <View>
      <Text style={styles.fieldHint}>
        Définissez chaque type de chambre disponible dans votre établissement. Le tarif affiché
        dans les recherches sera celui de la chambre la moins chère.
      </Text>

      {errors.roomTypes && <Text style={[styles.fieldError, { marginBottom: 12 }]}>{errors.roomTypes}</Text>}

      {roomTypes.map((rt: RoomType, i: number) => (
        <View key={rt.id} style={styles.roomTypeCard}>
          <View style={styles.roomTypeInfo}>
            <Text style={styles.roomTypeLabel}>{rt.label}</Text>
            <Text style={styles.roomTypePrice}>{rt.pricePerNight.toLocaleString('fr-CI')} FCFA / nuit</Text>
            <Text style={styles.roomTypeDetails}>{rt.capacity} pers. · {rt.beds} lit(s)</Text>
          </View>
          <View style={styles.roomTypeActions}>
            <TouchableOpacity onPress={() => openEdit(i)} style={styles.iconBtn}>
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(i)} style={styles.iconBtn}>
              <Text style={styles.deleteIcon}>🗑</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.addRoomTypeBtn} onPress={openCreate}>
        <Text style={styles.addRoomTypeBtnText}>+ Ajouter un type de chambre</Text>
      </TouchableOpacity>

      {/* Modal d'édition */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.roomTypeModal}>
            <Text style={styles.modalTitle}>
              {editingIndex !== null ? 'Modifier le type' : 'Nouveau type de chambre'}
            </Text>

            <Text style={styles.fieldLabel}>Catégorie</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {ROOM_TYPE_PRESETS.map(preset => (
                <TouchableOpacity
                  key={preset}
                  style={[styles.chip, formLabel === preset && styles.chipActive, { marginRight: 8 }]}
                  onPress={() => setFormLabel(preset)}
                >
                  <Text style={[styles.chipText, formLabel === preset && styles.chipTextActive]}>{preset}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {formError ? <Text style={[styles.fieldError, { marginBottom: 10 }]}>{formError}</Text> : null}

            <TextField
              label="Prix / nuit (FCFA)" required keyboardType="numeric"
              value={formPrice}
              onChange={setFormPrice}
              placeholder="Ex: 50 000"
            />
            <Counter label="Capacité (personnes)" value={formCapacity} onChange={setFormCapacity} min={1} max={20} />
            <Counter label="Nombre de lits"       value={formBeds}     onChange={setFormBeds}     min={1} max={10} />

            <View style={[styles.navRow, { marginTop: 16 }]}>
              <TouchableOpacity style={styles.prevBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.prevBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.nextBtn, { backgroundColor: '#1056E0' }]} onPress={handleSave}>
                <Text style={styles.nextBtnText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Équipements adaptés par type ──────────────────────────────────────────────

const AMENITIES_RESIDENCE = [
  { key: 'wifi',           label: '📶 WiFi' },
  { key: 'parking',        label: '🚗 Parking' },
  { key: 'pool',           label: '🏊 Piscine' },
  { key: 'ac',             label: '❄️ Climatisation' },
  { key: 'kitchen',        label: '🍳 Cuisine équipée' },
  { key: 'tv',             label: '📺 Télévision' },
  { key: 'washingMachine', label: '🫧 Machine à laver' },
  { key: 'balcony',        label: '🌿 Balcon / Terrasse' },
  { key: 'garden',         label: '🌳 Jardin' },
  { key: 'gym',            label: '🏋 Salle de sport' },
  { key: 'elevator',       label: '🛗 Ascenseur' },
  { key: 'security',       label: '🔒 Gardiennage 24h' },
  { key: 'generator',      label: '⚡ Groupe électrogène' },
  { key: 'waterTank',      label: '💧 Château d\'eau' },
  { key: 'restaurant',     label: '🍽 Restaurant' },
  { key: 'spa',            label: '🧖 Spa / Hammam' },
];

const AMENITIES_HOTEL = [
  { key: 'wifi',           label: '📶 WiFi gratuit' },
  { key: 'parking',        label: '🚗 Parking sécurisé' },
  { key: 'pool',           label: '🏊 Piscine' },
  { key: 'ac',             label: '❄️ Climatisation' },
  { key: 'restaurant',     label: '🍽 Restaurant' },
  { key: 'bar',            label: '🍸 Bar / Lounge' },
  { key: 'spa',            label: '🧖 Spa / Hammam' },
  { key: 'gym',            label: '🏋 Salle de sport' },
  { key: 'roomService',    label: '🛎 Room service' },
  { key: 'laundry',        label: '👔 Pressing / Blanchisserie' },
  { key: 'elevator',       label: '🛗 Ascenseur' },
  { key: 'security',       label: '🔒 Sécurité 24h/24' },
  { key: 'generator',      label: '⚡ Groupe électrogène' },
  { key: 'waterTank',      label: '💧 Réserve d\'eau' },
  { key: 'conferenceRoom', label: '📊 Salle de conférence' },
  { key: 'vipLounge',      label: '✨ Lounge VIP' },
  { key: 'airport',        label: '✈️ Navette aéroport' },
];

const AMENITIES_IMMOBILIER = [
  { key: 'parking',   label: '🚗 Parking / Garage' },
  { key: 'garden',    label: '🌳 Jardin' },
  { key: 'pool',      label: '🏊 Piscine' },
  { key: 'ac',        label: '❄️ Climatisation' },
  { key: 'kitchen',   label: '🍳 Cuisine équipée' },
  { key: 'elevator',  label: '🛗 Ascenseur' },
  { key: 'security',  label: '🔒 Résidence sécurisée' },
  { key: 'generator', label: '⚡ Groupe électrogène' },
  { key: 'waterTank', label: '💧 Château d\'eau' },
  { key: 'fence',     label: '🏡 Clôture / Portail' },
  { key: 'terrace',   label: '🌿 Terrasse' },
  { key: 'storage',   label: '📦 Local de stockage' },
];

const AMENITIES_RESTAURANT = [
  { key: 'wifi',        label: '📶 WiFi' },
  { key: 'parking',     label: '🚗 Parking' },
  { key: 'terrace',     label: '🌿 Terrasse extérieure' },
  { key: 'ac',          label: '❄️ Climatisation' },
  { key: 'liveMusic',   label: '🎵 Musique live' },
  { key: 'privateRoom', label: '🚪 Salle privée' },
  { key: 'delivery',    label: '🛵 Livraison à domicile' },
  { key: 'takeout',     label: '📦 Commande à emporter' },
  { key: 'halal',       label: '✅ Halal' },
  { key: 'vegan',       label: '🌱 Options végétariennes' },
];

function getAmenities(type?: string) {
  if (type === 'hotel')      return AMENITIES_HOTEL;
  if (isRealEstate(type))    return AMENITIES_IMMOBILIER;
  if (isRestaurant(type))    return AMENITIES_RESTAURANT;
  return AMENITIES_RESIDENCE;
}

function StepEquipements({ data, onChange }: any) {
  const amenities = getAmenities(data.type);
  const selected: string[] = data.amenities ?? [];
  const toggle = (key: string) => {
    const updated = selected.includes(key)
      ? selected.filter((a: string) => a !== key)
      : [...selected, key];
    onChange('amenities', updated);
  };
  return (
    <View style={styles.amenitiesGrid}>
      {amenities.map(a => {
        const active = selected.includes(a.key);
        return (
          <TouchableOpacity
            key={a.key}
            style={[styles.amenityChip, active && styles.amenityChipActive]}
            onPress={() => toggle(a.key)}
          >
            <Text style={[styles.amenityText, active && styles.amenityTextActive]}>{a.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Étape — Médias ────────────────────────────────────────────────────────────

function StepMedias({ data, onChange, subscriptionPlan }: any) {
  const images: { uri: string; name: string }[]     = data.images     ?? [];
  const tourImages: { uri: string; name: string; roomName?: string; existing?: boolean }[] = data.tourImages ?? [];
  const videoFiles: { uri: string; name: string }[] = data.videoFiles ?? [];
  const type: string = data.type ?? '';

  const planNorm       = (subscriptionPlan ?? '').toLowerCase();
  const isBusinessPlus  = planNorm === 'business'   || planNorm === 'entreprise';
  const isEntreprisePlan = planNorm === 'entreprise';

  const pickImages = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', multiple: true, copyToCacheDirectory: true });
    if (result.canceled) return;
    const assets = result.assets ?? [];
    const newImages = assets.slice(0, 20 - images.length).map((a: any) => ({ uri: a.uri, name: a.name ?? 'photo.jpg', file: a.file ?? undefined }));
    onChange('images', [...images, ...newImages]);
  };
  const removeImage = (i: number) => {
    const updated = [...images]; updated.splice(i, 1); onChange('images', updated);
  };
  const pickTourImages = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', multiple: true, copyToCacheDirectory: true });
    if (result.canceled) return;
    const assets = result.assets ?? [];
    // Max 10 photos 360° par bien (limite backend)
    const room = (n: number) => `Pièce ${n}`;
    const added = assets.slice(0, 10 - tourImages.length).map((a: any, idx: number) => ({
      uri: a.uri, name: a.name ?? 'tour360.jpg', file: a.file ?? undefined,
      roomName: room(tourImages.length + idx + 1),
    }));
    onChange('tourImages', [...tourImages, ...added]);
  };
  const removeTourImage = (i: number) => {
    const updated = [...tourImages]; updated.splice(i, 1); onChange('tourImages', updated);
  };
  const renameTourImage = (i: number, roomName: string) => {
    const updated = [...tourImages]; updated[i] = { ...updated[i], roomName }; onChange('tourImages', updated);
  };
  const pickVideo = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'video/*', multiple: false, copyToCacheDirectory: true });
    if (result.canceled) return;
    const assets = result.assets ?? [];
    onChange('videoFiles', [...videoFiles, ...assets.slice(0, 1 - videoFiles.length).map((a: any) => ({ uri: a.uri, name: a.name ?? 'video.mp4', file: a.file ?? undefined }))]);
  };
  const removeVideo = (i: number) => {
    const updated = [...videoFiles]; updated.splice(i, 1); onChange('videoFiles', updated);
  };

  return (
    <View>
      <Text style={styles.fieldLabel}>Photos ({images.length}/20)</Text>
      <Text style={styles.fieldHint}>La 1ère photo sera l&apos;image principale. Formats acceptés : JPG, PNG, WebP.</Text>
      <TouchableOpacity style={styles.uploadBtn} onPress={pickImages} disabled={images.length >= 20}>
        <Text style={styles.uploadBtnText}>📷 Choisir des photos</Text>
      </TouchableOpacity>
      <View style={styles.imageGrid}>
        {images.map((img, i) => (
          <View key={i} style={styles.imageThumb}>
            <Image source={{ uri: img.uri }} style={styles.imagePrev} />
            <TouchableOpacity style={styles.removeImgBtn} onPress={() => removeImage(i)}>
              <Text style={styles.removeImgText}>✕</Text>
            </TouchableOpacity>
            {i === 0 && <View style={styles.primaryBadge}><Text style={styles.primaryBadgeText}>Principale</Text></View>}
          </View>
        ))}
      </View>

      {/* Vidéo — non proposée pour les restaurants */}
      {!isRestaurant(type) && (
        <View style={[styles.infoBox, !isBusinessPlus && styles.infoBoxLocked]}>
          <Text style={styles.infoBoxTitle}>
            {isBusinessPlus ? '🎬 Vidéo de présentation' : '🔒 Vidéo — Business et Entreprise'}
          </Text>
          <Text style={styles.infoBoxText}>
            {isBusinessPlus
              ? `Ajoutez 1 vidéo de présentation (MP4, MOV, max 100 Mo). ${videoFiles.length}/1`
              : 'Passez à la formule Business ou Entreprise pour ajouter des vidéos.'}
          </Text>
          {isBusinessPlus && (
            <>
              <TouchableOpacity style={styles.tourBtn} onPress={pickVideo} disabled={videoFiles.length >= 1}>
                <Text style={styles.tourBtnText}>🎥 Ajouter une vidéo ({videoFiles.length}/1)</Text>
              </TouchableOpacity>
              {videoFiles.map((v, i) => (
                <View key={i} style={styles.videoRow}>
                  <Text style={styles.videoName} numberOfLines={1}>🎬 {v.name}</Text>
                  <TouchableOpacity onPress={() => removeVideo(i)}>
                    <Text style={styles.removeImgText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      {/* Visite 3D — uniquement hébergements */}
      {(isLodging(type) || isRealEstate(type)) && (
        <View style={[styles.infoBox, !isEntreprisePlan && styles.infoBoxLocked]}>
          <Text style={styles.infoBoxTitle}>
            {isEntreprisePlan ? '🔭 Visite 3D disponible' : '🔒 Visite 3D — Entreprise uniquement'}
          </Text>
          <Text style={styles.infoBoxText}>
            {isEntreprisePlan
              ? 'Ajoutez des photos équirectangulaires (2:1, min 4000×2000 px) pour activer la visite 3D.'
              : 'Passez à la formule Entreprise pour proposer une visite virtuelle 3D à vos clients.'}
          </Text>
          {isEntreprisePlan && (
            <>
              <TouchableOpacity style={styles.tourBtn} onPress={pickTourImages} disabled={tourImages.length >= 10}>
                <Text style={styles.tourBtnText}>🌐 Ajouter des photos 360° ({tourImages.length}/10)</Text>
              </TouchableOpacity>
              {tourImages.length > 0 && (
                <View style={styles.tourSheet}>
                  {tourImages.map((img: any, i) => (
                    <View key={i} style={styles.tourCard}>
                      <Image source={{ uri: img.uri }} style={styles.tourCardImg} />
                      <View style={styles.tourCardBody}>
                        <TextInput
                          style={styles.tourCardInput}
                          value={img.roomName ?? `Pièce ${i + 1}`}
                          onChangeText={(v) => renameTourImage(i, v)}
                          placeholder="Nom de la pièce (Salon, Chambre…)"
                          placeholderTextColor="#9CA3AF"
                          editable={!img.existing}
                        />
                        <TouchableOpacity onPress={() => removeTourImage(i)} hitSlop={8}>
                          <Text style={styles.removeImgText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.primaryBadge}><Text style={styles.primaryBadgeText}>360°</Text></View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

// ── Étape — Tarification (résidence + immobilier) ────────────────────────────

const PAYMENT_OPTION_LABELS: Record<string, string> = {
  full_online:        '💳 Paiement en ligne 100%',
  ten_percent_online: '💳 Acompte 10% en ligne + solde en espèces',
  zero_online:        '💵 Paiement 100% en espèces',
};
const ALL_PAYMENT_OPTIONS = ['full_online', 'ten_percent_online', 'zero_online'];

function StepTarification({ data, onChange, errors }: any) {
  const type: string = data.type ?? '';
  const paymentOptions: string[] = data.paymentOptions ?? [];

  const togglePayment = (key: string) => {
    const updated = paymentOptions.includes(key)
      ? paymentOptions.filter((p: string) => p !== key)
      : [...paymentOptions, key];
    onChange('paymentOptions', updated);
  };

  if (isRealEstate(type)) {
    return (
      <View>
        {type === 'immobilier_location' && (
          <TextField
            label="Loyer mensuel (FCFA)" required keyboardType="numeric"
            value={data.pricePerMonth ? String(data.pricePerMonth) : ''}
            onChange={(v: string) => onChange('pricePerMonth', Number(v) || undefined)}
            placeholder="Ex: 250 000"
            error={errors.pricePerMonth}
          />
        )}
        {(type === 'immobilier_terrain' || type === 'immobilier_achat') && (
          <TextField
            label="Prix de vente (FCFA)" required keyboardType="numeric"
            value={data.priceSale ? String(data.priceSale) : ''}
            onChange={(v: string) => onChange('priceSale', Number(v) || undefined)}
            placeholder="Ex: 15 000 000"
            error={errors.priceSale}
          />
        )}
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxTitle}>ℹ️ Paiement via expression d'intérêt</Text>
          <Text style={styles.infoBoxText}>
            Pour les biens immobiliers, les clients expriment leur intérêt directement via la messagerie.
            Aucun paiement en ligne n'est requis.
          </Text>
        </View>
      </View>
    );
  }

  // Résidence
  return (
    <View>
      <TextField
        label="Prix par nuit (FCFA)" required keyboardType="numeric"
        value={data.pricePerNight ? String(data.pricePerNight) : ''}
        onChange={(v: string) => onChange('pricePerNight', Number(v) || undefined)}
        placeholder="Ex: 25 000"
        error={errors.pricePerNight}
      />
      <TextField label="Réduction hebdomadaire (%)" keyboardType="numeric"
        value={data.weeklyDiscount ? String(data.weeklyDiscount) : ''}
        onChange={(v: string) => onChange('weeklyDiscount', Number(v) || undefined)}
        placeholder="Ex: 10"
      />
      <TextField label="Réduction mensuelle (%)" keyboardType="numeric"
        value={data.monthlyDiscount ? String(data.monthlyDiscount) : ''}
        onChange={(v: string) => onChange('monthlyDiscount', Number(v) || undefined)}
        placeholder="Ex: 20"
      />
      <TextField label="Frais de ménage (FCFA)" keyboardType="numeric"
        value={data.cleaningFee ? String(data.cleaningFee) : ''}
        onChange={(v: string) => onChange('cleaningFee', Number(v) || undefined)}
        placeholder="Ex: 5 000"
      />
      <TextField label="Caution / Dépôt (FCFA)" keyboardType="numeric"
        value={data.securityDeposit ? String(data.securityDeposit) : ''}
        onChange={(v: string) => onChange('securityDeposit', Number(v) || undefined)}
        placeholder="Ex: 50 000"
      />

      <View style={styles.field}>
        <FieldLabel label="Options de paiement acceptées" required />
        <Text style={styles.fieldHint}>Sélectionnez au moins une option.</Text>
        {ALL_PAYMENT_OPTIONS.map(key => {
          const active = paymentOptions.includes(key);
          return (
            <TouchableOpacity
              key={key}
              style={[styles.paymentOptionRow, active && styles.paymentOptionRowActive]}
              onPress={() => togglePayment(key)}
            >
              <View style={[styles.paymentCheckbox, active && styles.paymentCheckboxActive]}>
                {active && <Text style={styles.paymentCheckmark}>✓</Text>}
              </View>
              <Text style={[styles.paymentOptionText, active && styles.paymentOptionTextActive]}>
                {PAYMENT_OPTION_LABELS[key]}
              </Text>
            </TouchableOpacity>
          );
        })}
        {errors.paymentOptions && <Text style={styles.fieldError}>{errors.paymentOptions}</Text>}
      </View>
    </View>
  );
}

// ── Étape — Disponibilités (hébergements uniquement) ─────────────────────────

function CalendarPicker({ startDate, endDate, onSelect }: { startDate: string; endDate: string; onSelect: (s: string, e: string) => void }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [picking, setPicking]   = useState<'start' | 'end'>('start');

  const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const DAY_LABELS  = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDow    = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const toStr       = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const handleDay = (day: number) => {
    const ds = toStr(viewDate.getFullYear(), viewDate.getMonth(), day);
    if (picking === 'start') { onSelect(ds, endDate); setPicking('end'); }
    else { if (ds < startDate) { onSelect(ds, startDate); } else { onSelect(startDate, ds); } setPicking('start'); }
  };
  const isInRange = (day: number) => { const ds = toStr(viewDate.getFullYear(), viewDate.getMonth(), day); return ds >= startDate && ds <= endDate; };
  const isStart   = (day: number) => toStr(viewDate.getFullYear(), viewDate.getMonth(), day) === startDate;
  const isEnd     = (day: number) => toStr(viewDate.getFullYear(), viewDate.getMonth(), day) === endDate;
  const cells     = [...Array(firstDow).fill(null), ...Array(daysInMonth).fill(0).map((_: any, i: number) => i + 1)];

  return (
    <View style={styles.calContainer}>
      <View style={styles.calHeader}>
        <TouchableOpacity onPress={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}>
          <Text style={styles.calArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.calMonth}>{MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}</Text>
        <TouchableOpacity onPress={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}>
          <Text style={styles.calArrow}>›</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.calDayRow}>
        {DAY_LABELS.map(d => <Text key={d} style={styles.calDayLabel}>{d}</Text>)}
      </View>
      <View style={styles.calGrid}>
        {cells.map((day: number | null, i: number) => {
          if (!day) return <View key={`e${i}`} style={styles.calCell} />;
          const inRange = isInRange(day);
          const start = isStart(day);
          const end   = isEnd(day);
          return (
            <TouchableOpacity
              key={i}
              style={[styles.calCell, inRange && styles.calCellRange, (start || end) && styles.calCellSelected]}
              onPress={() => handleDay(day)}
            >
              <Text style={[styles.calCellText, (start || end) && styles.calCellTextSelected]}>{day}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.calHint}>
        {picking === 'start' ? 'Sélectionnez la date de début' : 'Sélectionnez la date de fin'}
        {startDate ? `\nDu : ${startDate}` : ''}
        {endDate   ? `  Au : ${endDate}`   : ''}
      </Text>
    </View>
  );
}

function StepDisponibilites({ data, onChange }: any) {
  const today       = new Date().toISOString().split('T')[0];
  const threeMonths = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
  return (
    <View>
      <Text style={styles.fieldLabel}>Plage de disponibilité initiale</Text>
      <Text style={styles.fieldHint}>
        Définissez la période où votre bien est disponible à la réservation.
        Vous pourrez ajuster le calendrier à tout moment depuis l&apos;onglet Propriétés.
      </Text>
      <CalendarPicker
        startDate={data.availableFrom ?? today}
        endDate={data.availableTo ?? threeMonths}
        onSelect={(s, e) => { onChange('availableFrom', s); onChange('availableTo', e); }}
      />
    </View>
  );
}

// ── Étape — Règles (hébergements uniquement) ──────────────────────────────────

const CHECK_TIMES = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];

function TimeSelector({ label, value, onChange }: any) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <FieldLabel label={label} />
      <TouchableOpacity style={styles.timeSelector} onPress={() => setOpen(!open)}>
        <Text style={styles.timeSelectorText}>{value ?? 'Sélectionner'}</Text>
        <Text style={styles.timeSelectorArrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.timeDropdown}>
          <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
            {CHECK_TIMES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.timeOption, value === t && styles.timeOptionActive]}
                onPress={() => { onChange(t); setOpen(false); }}
              >
                <Text style={[styles.timeOptionText, value === t && styles.timeOptionTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function StepRegles({ data, onChange }: any) {
  return (
    <View>
      <TimeSelector label="Heure d'arrivée (check-in)"  value={data.checkInTime}  onChange={(v: string) => onChange('checkInTime', v)}  />
      <TimeSelector label="Heure de départ (check-out)" value={data.checkOutTime} onChange={(v: string) => onChange('checkOutTime', v)} />
      <Counter label="Séjour minimum (nuits)" value={data.minStay ?? 1}  onChange={(v: number) => onChange('minStay', v)}  min={1} max={365} />
      <Counter label="Séjour maximum (nuits)" value={data.maxStay ?? 30} onChange={(v: number) => onChange('maxStay', v)}  min={1} max={365} />
      <View style={styles.rulesSection}>
        <ToggleRow label="🐾 Animaux acceptés"        value={data.petsAllowed}    onChange={(v: boolean) => onChange('petsAllowed', v)}    />
        <ToggleRow label="🚬 Fumeurs acceptés"        value={data.smokingAllowed} onChange={(v: boolean) => onChange('smokingAllowed', v)} />
        <ToggleRow label="🎉 Fêtes autorisées"        value={data.partiesAllowed} onChange={(v: boolean) => onChange('partiesAllowed', v)} />
        <ToggleRow label="⚡ Réservation instantanée" value={data.instantBooking} onChange={(v: boolean) => onChange('instantBooking', v)} />
      </View>
      <TextField
        label="Règles supplémentaires" multiline
        value={data.houseRules}
        onChange={(v: string) => onChange('houseRules', v)}
        placeholder="Ex: Pas de musique après 22h…"
      />
    </View>
  );
}

// ── Étape — Documents & Diagnostics (immobilier uniquement) ──────────────────

const DIAGNOSTICS_LIST = [
  { key: 'dpe',         label: '🔋 DPE (Diagnostic de Performance Énergétique)' },
  { key: 'carrez',      label: '📐 Loi Carrez (superficie certifiée)' },
  { key: 'amiante',     label: '⚠️ Diagnostic amiante' },
  { key: 'plomb',       label: '🚨 Diagnostic plomb (avant 1949)' },
  { key: 'electricite', label: '⚡ Diagnostic électricité (+15 ans)' },
  { key: 'gaz',         label: '🔥 Diagnostic gaz (+15 ans)' },
  { key: 'termites',    label: '🐛 Diagnostic termites' },
  { key: 'titreFoncier',label: '📄 Titre foncier disponible' },
  { key: 'permisConstruct', label: '🏗 Permis de construire' },
];

function StepDocuments({ data, onChange }: any) {
  const diagnostics: Record<string, boolean> = data.diagnostics ?? {};

  const toggleDiag = (key: string) => {
    onChange('diagnostics', { ...diagnostics, [key]: !diagnostics[key] });
  };

  return (
    <View>
      <View style={styles.field}>
        <FieldLabel label="Date de disponibilité" />
        <Text style={styles.fieldHint}>
          Date à partir de laquelle le bien est disponible pour visite ou occupation (format : AAAA-MM-JJ).
        </Text>
        <TextInput
          style={styles.input}
          value={data.availabilityDate ?? ''}
          onChangeText={(v: string) => onChange('availabilityDate', v)}
          placeholder="Ex: 2026-09-01"
          keyboardType="numeric"
          placeholderTextColor="#9CA3AF"
        />
      </View>

      <View style={styles.field}>
        <FieldLabel label="Documents & Diagnostics disponibles" />
        <Text style={styles.fieldHint}>Cochez les documents que vous êtes en mesure de fournir.</Text>
        {DIAGNOSTICS_LIST.map(d => {
          const active = !!diagnostics[d.key];
          return (
            <TouchableOpacity
              key={d.key}
              style={[styles.paymentOptionRow, active && styles.paymentOptionRowActive]}
              onPress={() => toggleDiag(d.key)}
            >
              <View style={[styles.paymentCheckbox, active && styles.paymentCheckboxActive]}>
                {active && <Text style={styles.paymentCheckmark}>✓</Text>}
              </View>
              <Text style={[styles.paymentOptionText, active && styles.paymentOptionTextActive]}>
                {d.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Étape — Configuration restaurant ─────────────────────────────────────────

function StepConfigRestaurant({ data, onChange }: any) {
  return (
    <View>
      <Counter
        label="Nombre de couverts (capacité)"
        value={data.capacity ?? 20}
        onChange={(v: number) => onChange('capacity', v)}
        min={1} max={1000}
      />

      <View style={styles.infoBox}>
        <Text style={styles.infoBoxTitle}>⏰ Gestion des créneaux horaires</Text>
        <Text style={styles.infoBoxText}>
          Définissez vos créneaux d'ouverture et la capacité par créneau depuis l&apos;onglet
          &ldquo;Créneaux&rdquo; de votre tableau de bord, une fois votre établissement validé.
        </Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoBoxTitle}>🍽 Gestion du menu</Text>
        <Text style={styles.infoBoxText}>
          Ajoutez vos entrées, plats, desserts et boissons depuis l&apos;onglet
          &ldquo;Menu&rdquo; de votre tableau de bord. Chaque article peut avoir
          une description, un prix et des informations sur les allergènes.
        </Text>
      </View>
    </View>
  );
}

// ── Modal de feedback ─────────────────────────────────────────────────────────

interface FeedbackState {
  visible: boolean;
  success: boolean;
  title: string;
  message: string;
  onDismiss?: () => void;
}

function FeedbackModal({ state, onClose }: { state: FeedbackState; onClose: () => void }) {
  const dismiss = () => { onClose(); state.onDismiss?.(); };
  return (
    <Modal visible={state.visible} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={[styles.modalIcon, { backgroundColor: state.success ? '#D1FAE5' : '#FEE2E2' }]}>
            <Text style={styles.modalIconText}>{state.success ? '✓' : '!'}</Text>
          </View>
          <Text style={styles.modalTitle}>{state.title}</Text>
          <Text style={styles.modalMessage}>{state.message}</Text>
          <TouchableOpacity
            style={[styles.modalBtn, { backgroundColor: state.success ? '#059669' : '#DC2626' }]}
            onPress={dismiss}
          >
            <Text style={styles.modalBtnText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Validation par étape ──────────────────────────────────────────────────────

function validateStep(stepName: string, data: Record<string, any>): Record<string, string> {
  const errors: Record<string, string> = {};
  const type: string = data.type ?? '';

  if (stepName === 'Informations') {
    if (!data.name?.trim() || data.name.trim().length < 3)
      errors.name = 'Nom requis (min 3 caractères)';
    if (!data.type)
      errors.type = 'Type de bien requis';
    if (!data.description?.trim() || data.description.trim().length < 10)
      errors.description = 'Description requise (min 10 caractères)';
    if (!data.city?.trim())
      errors.city = 'Ville requise';
    if (!data.street?.trim())
      errors.street = 'Adresse requise';
  }

  if (stepName === 'Types de chambre') {
    if (!data.roomTypes || (data.roomTypes as RoomType[]).length === 0)
      errors.roomTypes = 'Ajoutez au moins un type de chambre pour continuer.';
  }

  if (stepName === 'Tarification') {
    if (type === 'residence' && (!data.pricePerNight || data.pricePerNight <= 0))
      errors.pricePerNight = 'Prix par nuit requis';
    if (type === 'immobilier_location' && (!data.pricePerMonth || data.pricePerMonth <= 0))
      errors.pricePerMonth = 'Loyer mensuel requis';
    if ((type === 'immobilier_terrain' || type === 'immobilier_achat') && (!data.priceSale || data.priceSale <= 0))
      errors.priceSale = 'Prix de vente requis';
    if (type === 'residence' && (!data.paymentOptions || (data.paymentOptions as string[]).length === 0))
      errors.paymentOptions = 'Sélectionnez au moins une option de paiement';
  }

  return errors;
}

// ── Wizard principal ──────────────────────────────────────────────────────────

export default function AddPropertyScreen({ navigation, route }: any) {
  const theme  = useProTheme();
  const role   = useAuthStore((s) => s.user?.role);
  const editId: string | undefined = route?.params?.propertyId;
  const isEdit = !!editId;

  // Type déduit depuis le rôle ou depuis les paramètres de navigation
  const allowedTypes = useMemo(() => getAllowedTypes(role), [role]);
  const lockedType   = getLockedTypeForRole(role);
  const initialType: string | undefined = route?.params?.initialType ?? lockedType;

  const [isLoadingProperty, setIsLoadingProperty] = useState(isEdit);
  const [step, setStep]     = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({
    capacity:       lockedType === 'restaurant' ? 20 : 2,
    bedrooms:       1,
    beds:           1,
    bathrooms:      1,
    minStay:        1,
    maxStay:        30,
    checkInTime:    '14:00',
    checkOutTime:   '11:00',
    country:        "Côte d'Ivoire",
    amenities:      [],
    images:         [],
    tourImages:     [],
    roomTypes:      [],
    paymentOptions: lockedType === 'restaurant' ? ['zero_online'] : ['full_online'],
    instantBooking: true,
    // Type déterminé par le rôle ou les paramètres de navigation
    ...(initialType ? { type: initialType } : {}),
  });
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [feedback, setFeedback]     = useState<FeedbackState>({
    visible: false, success: true, title: '', message: '',
  });

  // Étapes calculées depuis le type de bien sélectionné
  const currentSteps = useMemo(() => getSteps(formData.type), [formData.type]);

  const onChange = useCallback((key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  // Chargement du plan d'abonnement pour les médias
  useEffect(() => {
    subscriptionsApi.getMySubscription()
      .then(res => {
        const sub  = res.data?.data ?? res.data;
        const plan = sub?.planType ?? sub?.plan;
        if (plan) setFormData(prev => ({ ...prev, subscriptionPlan: plan }));
      })
      .catch(() => {});
  }, []);

  // Ajustement des options de paiement selon le type
  useEffect(() => {
    const type = formData.type;
    if (isRestaurant(type) || isRealEstate(type)) {
      setFormData(prev => ({ ...prev, paymentOptions: ['zero_online'] }));
    }
  }, [formData.type]);

  // Recalage de l'index si le type change et rend l'étape actuelle inexistante
  useEffect(() => {
    setStep(prev => Math.min(prev, currentSteps.length - 1));
  }, [currentSteps]);

  // Chargement de la propriété existante en mode édition
  useEffect(() => {
    if (!editId) return;
    setIsLoadingProperty(true);
    propertiesApi.getById(editId)
      .then(res => {
        const p = res.data?.data ?? res.data;
        if (!p) return;
        const rules = p.rules ?? {};
        const media = p.media ?? p.images ?? [];
        setFormData(prev => ({
          ...prev,
          name:           p.title,
          type:           p.propertyType,
          description:    p.description,
          city:           p.city,
          street:         p.street,
          cuisineType:    p.cuisineType,
          bedrooms:       p.bedrooms      ?? prev.bedrooms,
          beds:           p.beds          ?? prev.beds,
          bathrooms:      p.bathrooms     ?? prev.bathrooms,
          capacity:       p.capacity      ?? prev.capacity,
          surface:        p.surface       ?? prev.surface,
          rooms:          p.rooms         ?? prev.rooms,
          floor:          p.floor         ?? rules.floor,
          yearBuilt:      p.yearBuilt,
          availabilityDate: p.availabilityDate ? String(p.availabilityDate).split('T')[0] : undefined,
          diagnostics:    p.diagnostics   ?? {},
          roomTypes:      p.roomTypes     ?? [],
          amenities:      p.amenities     ?? [],
          paymentOptions: p.paymentOptions?.length ? p.paymentOptions : prev.paymentOptions,
          pricePerNight:  p.pricePerNight ?? undefined,
          pricePerMonth:  p.pricePerMonth ?? undefined,
          priceSale:      p.priceSale     ?? undefined,
          images: media
            .filter((m: any) => (m.mediaType ?? 'photo') !== 'virtual_tour_360')
            .map((m: any) => ({ uri: m.url, url: m.url, id: m.id, name: 'photo.jpg', existing: true })),
          // Scènes 3D : nouvelle table property_3d_scenes, repli sur les anciens
          // médias virtual_tour_360 pour les biens créés avant la migration.
          tourImages: (p.scenes3d?.length
            ? p.scenes3d.map((s: any) => ({ uri: s.url, url: s.url, id: s.id, name: 'tour.jpg', roomName: s.roomName, existing: true }))
            : media
                .filter((m: any) => m.mediaType === 'virtual_tour_360')
                .map((m: any) => ({ uri: m.url, url: m.url, id: m.id, name: 'tour.jpg', existing: true }))),
          checkInTime:    rules.checkInTime    ?? prev.checkInTime,
          checkOutTime:   rules.checkOutTime   ?? prev.checkOutTime,
          minStay:        rules.minStay        ?? prev.minStay,
          maxStay:        rules.maxStay        ?? prev.maxStay,
          petsAllowed:    rules.petsAllowed    ?? false,
          smokingAllowed: rules.smokingAllowed ?? false,
          partiesAllowed: rules.partiesAllowed ?? false,
          instantBooking: rules.instantBooking ?? prev.instantBooking,
          houseRules:     rules.houseRules,
          weeklyDiscount: rules.weeklyDiscount,
          monthlyDiscount:rules.monthlyDiscount,
          cleaningFee:    rules.cleaningFee,
          securityDeposit:rules.securityDeposit,
        }));
      })
      .catch(() => showFeedback(false, 'Erreur', "Impossible de charger l'annonce à modifier."))
      .finally(() => setIsLoadingProperty(false));
  }, [editId]);

  const showFeedback = (success: boolean, title: string, message: string, onDismiss?: () => void) => {
    setFeedback({ visible: true, success, title, message, onDismiss });
  };

  const handleNext = async () => {
    const stepName = currentSteps[step] ?? '';
    const errs = validateStep(stepName, formData);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});

    if (step < currentSteps.length - 1) {
      setStep(s => s + 1);
      return;
    }

    // ── Soumission finale ─────────────────────────────────────────────────────
    setIsSubmitting(true);
    try {
      const type: string = formData.type ?? 'residence';

      const payload: Record<string, any> = {
        title:         formData.name,
        propertyType:  type,
        description:   formData.description,
        city:          formData.city,
        street:        formData.street,
        amenities:     formData.amenities ?? [],
        paymentOptions:(formData.paymentOptions as string[]) ?? ['zero_online'],
        capacity:      formData.capacity,
        surface:       formData.surface,
        cuisineType:   formData.cuisineType,
      };

      // Caractéristiques selon le type
      if (type === 'residence') {
        Object.assign(payload, {
          bedrooms: formData.bedrooms,
          beds:     formData.beds,
          bathrooms:formData.bathrooms,
          floor:    formData.floor,
          pricePerNight: formData.pricePerNight,
          rules: {
            checkInTime:    formData.checkInTime,
            checkOutTime:   formData.checkOutTime,
            minStay:        formData.minStay,
            maxStay:        formData.maxStay,
            petsAllowed:    formData.petsAllowed    ?? false,
            smokingAllowed: formData.smokingAllowed ?? false,
            partiesAllowed: formData.partiesAllowed ?? false,
            instantBooking: formData.instantBooking ?? false,
            houseRules:     formData.houseRules,
            weeklyDiscount: formData.weeklyDiscount,
            monthlyDiscount:formData.monthlyDiscount,
            cleaningFee:    formData.cleaningFee,
            securityDeposit:formData.securityDeposit,
          },
        });
      } else if (type === 'hotel') {
        const roomTypes: RoomType[] = formData.roomTypes ?? [];
        // Dériver le pricePerNight depuis le type de chambre le moins cher
        const minPrice = roomTypes.length ? Math.min(...roomTypes.map((rt: RoomType) => rt.pricePerNight)) : undefined;
        Object.assign(payload, {
          bathrooms: formData.bathrooms,
          roomTypes,
          pricePerNight: minPrice,
          rules: {
            checkInTime:    formData.checkInTime,
            checkOutTime:   formData.checkOutTime,
            petsAllowed:    formData.petsAllowed    ?? false,
            smokingAllowed: formData.smokingAllowed ?? false,
          },
        });
      } else if (isRealEstate(type)) {
        Object.assign(payload, {
          rooms:           formData.rooms,
          bathrooms:       formData.bathrooms,
          floor:           formData.floor,
          yearBuilt:       formData.yearBuilt,
          availabilityDate:formData.availabilityDate,
          diagnostics:     formData.diagnostics ?? {},
          pricePerMonth:   type === 'immobilier_location' ? formData.pricePerMonth : undefined,
          priceSale:       (type === 'immobilier_achat' || type === 'immobilier_terrain') ? formData.priceSale : undefined,
        });
      }
      // Restaurant : on envoie juste les champs de base (menu géré séparément)

      let propId: string;
      if (isEdit && editId) {
        await propertiesApi.update(editId, payload);
        propId = editId;
      } else {
        const res  = await propertiesApi.create(payload);
        const prop = res.data?.data ?? res.data;
        propId = prop?.id;
      }

      if (!propId) throw new Error('Identifiant de propriété non reçu du serveur');

      // Plage de disponibilité initiale (résidence et hôtel uniquement)
      if (isLodging(type) && formData.availableFrom && formData.availableTo) {
        availabilitiesApi.setAvailability(propId, {
          startDate: formData.availableFrom,
          endDate:   formData.availableTo,
          isAvailable: true,
        }).catch(() => {});
      }

      // Upload des nouveaux médias
      const allImages     = (formData.images     ?? []).filter((img: any) => !img.existing);
      const allTourImages = (formData.tourImages ?? []).filter((img: any) => !img.existing);
      const allVideoFiles = (formData.videoFiles ?? []).filter((v: any) => !v.existing);
      let mediaResult = { uploaded: 0, failed: 0 };

      if (allImages.length > 0 || allTourImages.length > 0 || allVideoFiles.length > 0) {
        mediaResult = await uploadPropertyMedia(propId, allImages, {
          tourImages: allTourImages,
          videoFiles: allVideoFiles,
          onProgress: (done: number, total: number) => setUploadStatus(`Envoi des médias… ${done}/${total}`),
        });
      }
      setUploadStatus(null);

      const warn = mediaResult.failed > 0
        ? `\n(${mediaResult.failed} photo(s) n'ont pas pu être envoyées — vous pourrez les ajouter depuis votre liste d'annonces.)`
        : '';

      showFeedback(
        true,
        isEdit ? 'Annonce mise à jour !' : 'Annonce soumise !',
        isEdit
          ? `"${formData.name}" a été mise à jour.\n\nLes modifications sont en cours de validation par notre équipe.${warn}`
          : `"${formData.name}" a été créée avec succès.\n\nElle est en cours de validation par notre équipe. Vous serez notifié dès son approbation.${warn}`,
        () => navigation.goBack(),
      );
    } catch (e: any) {
      setUploadStatus(null);
      const status: number = e?.response?.status ?? 0;
      if (status === 403) {
        showFeedback(
          false,
          'Limite d\'annonces atteinte',
          'Vous avez atteint le nombre maximum d\'annonces incluses dans votre formule actuelle.\n\nPassez à une formule supérieure pour publier davantage.',
          () => navigation.navigate('Subscriptions'),
        );
        return;
      }
      const apiMsg: string = e?.response?.data?.message ?? e?.response?.data?.error ?? '';
      const msg = apiMsg || e?.message || 'Impossible de créer la propriété. Vérifiez vos informations et réessayez.';
      showFeedback(false, 'Erreur de création', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    const stepName = currentSteps[step] ?? '';
    switch (stepName) {
      case 'Informations':      return <StepInformations      data={formData} onChange={onChange} errors={errors} allowedTypes={allowedTypes} />;
      case 'Caractéristiques':  return <StepCaracteristiques  data={formData} onChange={onChange} />;
      case 'Types de chambre':  return <StepTypesChambres     data={formData} onChange={onChange} errors={errors} />;
      case 'Équipements':       return <StepEquipements       data={formData} onChange={onChange} />;
      case 'Photos':
      case 'Médias':            return <StepMedias            data={formData} onChange={onChange} subscriptionPlan={formData.subscriptionPlan} />;
      case 'Tarification':      return <StepTarification      data={formData} onChange={onChange} errors={errors} />;
      case 'Disponibilités':    return <StepDisponibilites    data={formData} onChange={onChange} />;
      case 'Règles':            return <StepRegles            data={formData} onChange={onChange} />;
      case 'Documents':         return <StepDocuments         data={formData} onChange={onChange} />;
      case 'Configuration':     return <StepConfigRestaurant  data={formData} onChange={onChange} />;
      default:                  return null;
    }
  };

  const progress = (step + 1) / currentSteps.length;

  if (isLoadingProperty) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]} edges={['top']}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>Chargement de l&apos;annonce…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* En-tête de progression */}
      <View style={[styles.progressHeader, { backgroundColor: theme.primaryLight }]}>
        <TouchableOpacity
          onPress={() => step > 0 ? setStep(s => s - 1) : navigation.goBack()}
          style={styles.headerBackBtn}
        >
          <Text style={[styles.headerBackIcon, { color: theme.primary }]}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.progressLabel, { color: theme.primary }]}>
            {step + 1}/{currentSteps.length} — {currentSteps[step]}
          </Text>
          <View style={[styles.progressBar, { backgroundColor: theme.primary + '25' }]}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: theme.primary }]} />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Navigation bas de page */}
      <View style={styles.navRow}>
        {step > 0 && (
          <TouchableOpacity style={styles.prevBtn} onPress={() => setStep(s => s - 1)}>
            <Text style={styles.prevBtnText}>Précédent</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: theme.primary }, isSubmitting && { opacity: 0.6 }]}
          onPress={handleNext}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? (uploadStatus
                ? <Text style={styles.nextBtnText}>{uploadStatus}</Text>
                : <ActivityIndicator color="#fff" />)
            : <Text style={styles.nextBtnText}>
                {step === currentSteps.length - 1
                  ? (isEdit ? 'Enregistrer les modifications' : "Publier l'annonce")
                  : 'Suivant →'}
              </Text>
          }
        </TouchableOpacity>
      </View>

      <FeedbackModal
        state={feedback}
        onClose={() => setFeedback(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },

  progressHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingTop: 12, paddingBottom: 16, gap: 12,
  },
  headerBackBtn:  { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerBackIcon: { fontSize: 22, fontWeight: '700' },
  progressLabel:  { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  progressBar:    { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:   { height: '100%' as any, borderRadius: 3 },

  content: { padding: 16 },
  navRow: {
    flexDirection: 'row', padding: 16, gap: 12,
    borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#fff',
  },
  prevBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  prevBtnText: { color: '#374151', fontWeight: '700', fontSize: 15 },
  nextBtn:     { flex: 2, borderRadius: 12, padding: 14, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  field:      { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldHint:  { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  fieldError: { fontSize: 12, color: '#DC2626', marginTop: 4 },
  input: {
    borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10,
    padding: 12, fontSize: 15, color: '#111827', backgroundColor: '#fff',
  },
  inputMulti: { height: 100, textAlignVertical: 'top' },
  inputError: { borderColor: '#DC2626' },

  chipRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#fff' },
  chipActive:     { borderColor: '#1056E0', backgroundColor: '#EFF4FF' },
  chipText:       { fontSize: 13, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#1056E0', fontWeight: '700' },

  counterRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  counterLabel:   { fontSize: 15, color: '#111827', fontWeight: '500' },
  counterCtrl:    { flexDirection: 'row', alignItems: 'center', gap: 16 },
  counterBtn:     { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: '#1056E0', justifyContent: 'center', alignItems: 'center' },
  counterBtnText: { fontSize: 20, color: '#1056E0', fontWeight: '600', lineHeight: 22 },
  counterVal:     { fontSize: 18, fontWeight: '700', color: '#111827', minWidth: 28, textAlign: 'center' },

  toggleRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  toggleLabel:  { fontSize: 15, color: '#111827', fontWeight: '500' },
  rulesSection: { backgroundColor: '#fff', borderRadius: 12, padding: 8, marginBottom: 16 },

  amenitiesGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amenityChip:       { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#fff' },
  amenityChipActive: { borderColor: '#1056E0', backgroundColor: '#EFF4FF' },
  amenityText:       { fontSize: 13, color: '#374151', fontWeight: '500' },
  amenityTextActive: { color: '#1056E0', fontWeight: '700' },

  uploadBtn:        { borderWidth: 1.5, borderColor: '#1056E0', borderStyle: 'dashed', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 12 },
  uploadBtnText:    { color: '#1056E0', fontWeight: '600', fontSize: 15 },
  imageGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  imageThumb:       { width: 80, height: 80, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  imagePrev:        { width: 80, height: 80 },
  removeImgBtn:     { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  removeImgText:    { color: '#fff', fontSize: 10, fontWeight: '700' },
  primaryBadge:     { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(16,86,224,0.8)', paddingVertical: 2 },
  primaryBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700', textAlign: 'center' },
  tourBtn:          { backgroundColor: '#F0F5FF', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 },
  tourBtnText:      { color: '#1056E0', fontWeight: '600', fontSize: 13 },
  videoRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 8, padding: 10, marginTop: 6, borderWidth: 1, borderColor: '#E5E7EB' },
  videoName:        { flex: 1, fontSize: 12, color: '#374151', marginRight: 8 },
  tourSheet:        { marginTop: 10, gap: 8 },
  tourCard:         { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  tourCardImg:      { width: '100%', height: 90 },
  tourCardBody:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, gap: 8 },
  tourCardInput:    { flex: 1, fontSize: 13, color: '#111827', paddingVertical: 4 },
  infoBox:          { backgroundColor: '#EFF4FF', borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: '#1056E0', marginBottom: 16 },
  infoBoxLocked:    { backgroundColor: '#F3F4F6', borderLeftColor: '#9CA3AF' },
  infoBoxTitle:     { fontSize: 14, fontWeight: '700', color: '#1E40AF', marginBottom: 4 },
  infoBoxText:      { fontSize: 13, color: '#374151', lineHeight: 18 },

  paymentOptionRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, marginBottom: 8, backgroundColor: '#fff' },
  paymentOptionRowActive:  { borderColor: '#1056E0', backgroundColor: '#EFF4FF' },
  paymentCheckbox:         { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  paymentCheckboxActive:   { backgroundColor: '#1056E0', borderColor: '#1056E0' },
  paymentCheckmark:        { color: '#fff', fontSize: 13, fontWeight: '800' },
  paymentOptionText:       { flex: 1, fontSize: 14, color: '#374151', fontWeight: '500' },
  paymentOptionTextActive: { color: '#1056E0', fontWeight: '700' },

  // Types de chambre (hôtel)
  roomTypeCard:    { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  roomTypeInfo:    { flex: 1 },
  roomTypeLabel:   { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  roomTypePrice:   { fontSize: 14, color: '#1056E0', fontWeight: '600', marginBottom: 2 },
  roomTypeDetails: { fontSize: 12, color: '#6B7280' },
  roomTypeActions: { flexDirection: 'row', gap: 8 },
  iconBtn:         { padding: 8 },
  editIcon:        { fontSize: 18 },
  deleteIcon:      { fontSize: 18 },
  addRoomTypeBtn:  { borderWidth: 1.5, borderColor: '#1056E0', borderStyle: 'dashed', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
  addRoomTypeBtnText: { color: '#1056E0', fontWeight: '700', fontSize: 15 },

  roomTypeModal: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, margin: 24,
    maxHeight: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 12,
  },

  calContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8 },
  calHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  calArrow:     { fontSize: 24, color: '#1056E0', fontWeight: '700', paddingHorizontal: 10 },
  calMonth:     { fontSize: 15, fontWeight: '700', color: '#111827' },
  calDayRow:    { flexDirection: 'row', marginBottom: 4 },
  calDayLabel:  { flex: 1, textAlign: 'center', fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  calGrid:      { flexDirection: 'row', flexWrap: 'wrap' },
  calCell:             { width: `${100 / 7}%` as any, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calCellRange:        { backgroundColor: '#EFF4FF' },
  calCellSelected:     { backgroundColor: '#1056E0', borderRadius: 20 },
  calCellText:         { fontSize: 13, color: '#111827' },
  calCellTextSelected: { color: '#fff', fontWeight: '700' },
  calHint:      { fontSize: 12, color: '#6B7280', marginTop: 8, textAlign: 'center' },

  timeSelector:         { flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  timeSelectorText:     { fontSize: 15, color: '#111827' },
  timeSelectorArrow:    { fontSize: 13, color: '#6B7280' },
  timeDropdown:         { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, backgroundColor: '#fff', marginTop: 4, overflow: 'hidden' },
  timeOption:           { paddingVertical: 10, paddingHorizontal: 16 },
  timeOptionActive:     { backgroundColor: '#EFF4FF' },
  timeOptionText:       { fontSize: 14, color: '#374151' },
  timeOptionTextActive: { color: '#1056E0', fontWeight: '700' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  modalCard:     { backgroundColor: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 360, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 },
  modalIcon:     { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  modalIconText: { fontSize: 28, fontWeight: '800' },
  modalTitle:    { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 10, textAlign: 'center' },
  modalMessage:  { fontSize: 14, color: '#6B7280', lineHeight: 20, textAlign: 'center', marginBottom: 20 },
  modalBtn:      { borderRadius: 12, paddingVertical: 13, paddingHorizontal: 32 },
  modalBtnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
});
