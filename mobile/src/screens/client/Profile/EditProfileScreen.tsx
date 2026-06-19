// EditProfileScreen — formulaire de modification du profil utilisateur
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../../navigation/types';
import { usersApi } from '../../../services/api/endpoints/users';
import { useAuthStore } from '../../../store/authStore';

// ── Types ─────────────────────────────────────────────────────────────────────

type Nav = NativeStackNavigationProp<ClientStackParamList>;

/** Options de genre disponibles */
const GENRE_OPTIONS = [
  { value: 'male', label: 'Homme' },
  { value: 'female', label: 'Femme' },
  { value: 'other', label: 'Autre' },
  { value: 'prefer_not_to_say', label: 'Non précisé' },
] as const;

/** Vérifie si le rôle correspond à un professionnel */
function isPro(role: string): boolean {
  return role !== 'client' && role !== 'admin';
}

// ── Sous-composant : champ de formulaire ──────────────────────────────────────

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  required = false,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'url';
  required?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.fieldLabel}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

// ── Écran ─────────────────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  // Champs personnels
  const proUser = user as typeof user & {
    dateOfBirth?: string;
    gender?: string;
    businessName?: string;
    rccm?: string;
    taxId?: string;
    description?: string;
  };

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(proUser?.dateOfBirth ?? '');
  const [gender, setGender] = useState(proUser?.gender ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');

  // Champs professionnels
  const [businessName, setBusinessName] = useState(proUser?.businessName ?? '');
  const [rccm, setRccm] = useState(proUser?.rccm ?? '');
  const [taxId, setTaxId] = useState(proUser?.taxId ?? '');
  const [description, setDescription] = useState(proUser?.description ?? '');

  const [loading, setLoading] = useState(false);

  const professional = user ? isPro(user.role) : false;

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = (): string | null => {
    if (!firstName.trim()) return 'Le prénom est requis.';
    if (!lastName.trim()) return 'Le nom est requis.';
    if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      return 'La date de naissance doit être au format AAAA-MM-JJ.';
    }
    if (professional && !businessName.trim()) {
      return "Le nom de l'établissement est requis.";
    }
    return null;
  };

  // ── Sauvegarde ────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const error = validate();
    if (error) {
      Alert.alert('Champ manquant', error);
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        ...(dateOfBirth.trim() && { birthDate: dateOfBirth.trim() }),
        ...(gender && gender !== 'prefer_not_to_say' && { gender }),
        ...(avatarUrl.trim() && { avatarUrl: avatarUrl.trim() }),
      };

      if (professional) {
        Object.assign(payload, {
          businessName: businessName.trim(),
          ...(rccm.trim() && { rccm: rccm.trim() }),
          ...(taxId.trim() && { taxId: taxId.trim() }),
          ...(description.trim() && { description: description.trim() }),
        });
      }

      const res = await usersApi.updateProfile(payload);
      const updated = res.data?.data ?? res.data;

      // Mise à jour du store avec les nouvelles données
      if (user) {
        setUser({ ...user, ...updated });
      }

      Alert.alert('Succès', 'Votre profil a été mis à jour.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; message?: string } } };
      Alert.alert('Erreur', err.response?.data?.error ?? err.response?.data?.message ?? 'Impossible de mettre à jour le profil.');
    } finally {
      setLoading(false);
    }
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F6FB" />

      {/* En-tête */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Modifier le profil</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Section personnelle */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>
          <FormField label="Prénom" value={firstName} onChangeText={setFirstName} required />
          <FormField label="Nom" value={lastName} onChangeText={setLastName} required />
          <FormField label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <FormField
            label="Date de naissance"
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholder="AAAA-MM-JJ"
          />

          {/* Sélecteur de genre */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>Genre</Text>
            <View style={styles.genderRow}>
              {GENRE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.genderChip, gender === opt.value && styles.genderChipActive]}
                  onPress={() => setGender(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.genderLabel, gender === opt.value && styles.genderLabelActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* URL avatar */}
          <FormField
            label="Photo de profil (URL)"
            value={avatarUrl}
            onChangeText={setAvatarUrl}
            placeholder="https://..."
            keyboardType="url"
          />
        </View>

        {/* Section professionnelle */}
        {professional && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Informations professionnelles</Text>
            <FormField label="Nom de l'établissement" value={businessName} onChangeText={setBusinessName} required />
            <FormField label="RCCM" value={rccm} onChangeText={setRccm} />
            <FormField label="Numéro fiscal" value={taxId} onChangeText={setTaxId} />
            <FormField label="Description" value={description} onChangeText={setDescription} multiline />
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading} activeOpacity={0.8}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveText}>Enregistrer</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, paddingTop: 16, backgroundColor: '#F4F6FB' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: { minWidth: 64 },
  backText: { color: '#1056E0', fontSize: 15, fontWeight: '600' },
  topTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
  scroll: { padding: 16, paddingBottom: 48 },

  // Cartes
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 14,
    paddingBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Champ de formulaire
  fieldWrapper: { paddingHorizontal: 16, paddingTop: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  required: { color: '#EF4444' },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FAFAFA',
  },
  inputMultiline: { minHeight: 100, paddingTop: 12 },

  // Sélecteur de genre
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  genderChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  genderChipActive: { borderColor: '#1056E0', backgroundColor: '#EFF6FF' },
  genderLabel: { fontSize: 14, color: '#374151', fontWeight: '500' },
  genderLabelActive: { color: '#1056E0', fontWeight: '700' },

  // Boutons d'action
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  cancelText: { color: '#374151', fontWeight: '700', fontSize: 15 },
  saveBtn: {
    flex: 2,
    backgroundColor: '#1056E0',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
