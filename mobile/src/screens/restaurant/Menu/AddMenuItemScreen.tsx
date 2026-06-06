import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormInput } from '../../../components/form/FormInput';
import { restaurantApi } from '../../../services/api/endpoints/restaurantApi';

interface MenuItem {
  id: string;
  name: string;
  section: string;
  description?: string;
  price: number;
  isAvailable: boolean;
}

interface Props {
  route: { params: { propertyId: string; item?: MenuItem } };
  navigation: any;
}

export default function AddMenuItemScreen({ route, navigation }: Props) {
  const { propertyId, item } = route.params;
  const isEditing = !!item;

  const [name, setName] = useState(item?.name ?? '');
  const [section, setSection] = useState(item?.section ?? '');
  const [price, setPrice] = useState(item ? String(item.price) : '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [isAvailable, setIsAvailable] = useState(item?.isAvailable ?? true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Le nom est requis';
    if (!section.trim()) newErrors.section = 'La catégorie est requise';
    if (!price.trim()) {
      newErrors.price = 'Le prix est requis';
    } else if (isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      newErrors.price = 'Prix invalide';
    }
    return newErrors;
  };

  const handleSubmit = async () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSaving(true);

    const payload = {
      name: name.trim(),
      section: section.trim(),
      price: parseFloat(price),
      description: description.trim() || undefined,
      isAvailable,
    };

    try {
      if (isEditing && item) {
        await restaurantApi.updateMenuItem(propertyId, item.id, {
          name: payload.name,
          description: payload.description,
          price: payload.price,
          isAvailable: payload.isAvailable,
        });
      } else {
        await restaurantApi.createMenuItem(propertyId, payload);
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert(
        'Erreur',
        e?.message ?? (isEditing ? 'Impossible de modifier l\'article' : 'Impossible de créer l\'article')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {isEditing ? 'Modifier l\'article' : 'Nouvel article'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FormInput
          label="Nom du plat *"
          value={name}
          onChangeText={v => { setName(v); setErrors(e => ({ ...e, name: '' })); }}
          placeholder="ex : Poulet braisé"
          error={errors.name}
          autoCapitalize="words"
        />

        <FormInput
          label="Catégorie / Section *"
          value={section}
          onChangeText={v => { setSection(v); setErrors(e => ({ ...e, section: '' })); }}
          placeholder="ex : Plats principaux"
          error={errors.section}
          autoCapitalize="words"
        />

        <FormInput
          label="Prix (FCFA) *"
          value={price}
          onChangeText={v => { setPrice(v); setErrors(e => ({ ...e, price: '' })); }}
          placeholder="ex : 5000"
          keyboardType="numeric"
          error={errors.price}
        />

        <FormInput
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Décrivez brièvement ce plat…"
          multiline
          numberOfLines={3}
        />

        {/* Availability toggle */}
        <View style={s.toggleContainer}>
          <View style={s.toggleInfo}>
            <Text style={s.toggleLabel}>Disponible à la commande</Text>
            <Text style={s.toggleSubLabel}>
              {isAvailable ? 'Ce plat est visible et commandable' : 'Ce plat est masqué pour les clients'}
            </Text>
          </View>
          <Switch
            value={isAvailable}
            onValueChange={setIsAvailable}
            trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
            thumbColor={isAvailable ? '#1056E0' : '#9CA3AF'}
          />
        </View>

        {/* Submit button */}
        <TouchableOpacity
          style={[s.submitBtn, saving && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={s.submitBtnText}>
              {isEditing ? 'Enregistrer les modifications' : 'Ajouter au menu'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={s.cancelBtn}
          onPress={() => navigation.goBack()}
          disabled={saving}
        >
          <Text style={s.cancelBtnText}>Annuler</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backIcon: { fontSize: 22, color: '#1056E0', fontWeight: '700' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  toggleSubLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 3 },

  submitBtn: {
    backgroundColor: '#1056E0',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#1056E0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.6, shadowOpacity: 0 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  cancelBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
});
