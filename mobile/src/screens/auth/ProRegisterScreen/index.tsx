// Écran d'inscription professionnel en 3 étapes — design premium inspiré WelcomeScreen
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, Linking,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, type Theme } from '../../../theme/ThemeProvider';
import { authApi } from '../../../services/api/endpoints/auth';
import { useAuthStore } from '../../../store/authStore';
import { STORAGE_KEYS } from '../../../constants/storageKeys';
import { isValidIvorianPhone, validatePassword, normalizeIvorianPhone } from '../auth.utils';
import type { AuthScreenProps } from '../../../navigation/types';
import { trackEvent } from '../../../services/analytics';

// ── Constantes de couleurs premium ────────────────────────────────────────────

const BRAND_BLUE  = '#1056E0';
const DARK_NAVY   = '#040C1F';
const BLUE_LIGHT  = '#EFF4FF';

// ── Types ──────────────────────────────────────────────────────────────────────

type ProType = 'professional_hebergement' | 'professional_hotel' | 'professional_immobilier' | 'restaurateur';

type FormData = {
  proType: ProType | null;
  acceptedTerms: boolean;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  businessName: string;
  businessAddress: string;
  rccm: string;
  taxNumber: string;
  referralCode: string;
};

// ── Données des options pro ────────────────────────────────────────────────────

const PRO_OPTIONS: { value: ProType; emoji: string; label: string; description: string }[] = [
  { value: 'professional_hebergement', emoji: '🏠', label: 'Résidence / Appartement', description: 'Louez vos résidences meublées, appartements ou maisons.' },
  { value: 'professional_hotel',       emoji: '🏨', label: 'Hôtel',                   description: 'Gérez les chambres et réservations de votre établissement hôtelier.' },
  { value: 'professional_immobilier',  emoji: '🏢', label: 'Immobilier',              description: 'Publiez des biens immobiliers à la vente ou à la location longue durée.' },
  { value: 'restaurateur',            emoji: '🍽️', label: 'Restaurateur',            description: 'Gérez les réservations de table et votre carte.' },
];

// ── État initial du formulaire ─────────────────────────────────────────────────

const INITIAL: FormData = {
  proType: null, acceptedTerms: false,
  firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '',
  businessName: '', businessAddress: '', rccm: '', taxNumber: '', referralCode: '',
};

type Props = AuthScreenProps<'ProRegister'>;

// ── Composant principal ────────────────────────────────────────────────────────

export function ProRegisterScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(INITIAL);
  const TOTAL_STEPS = 3;

  const update = (patch: Partial<FormData>) => setData(p => ({ ...p, ...patch }));
  const goNext = () => setStep(s => s + 1);
  const goBack = () => {
    if (step === 1) navigation.goBack();
    else setStep(s => s - 1);
  };

  const common = { data, onUpdate: update, onBack: goBack, currentStep: step, totalSteps: TOTAL_STEPS, theme };

  switch (step) {
    case 1: return <StepProType      {...common} onNext={goNext} />;
    case 2: return <StepPersonalInfo {...common} onNext={goNext} />;
    case 3: return <StepProInfo      {...common} navigation={navigation} />;
    default: return null;
  }
}

export default ProRegisterScreen;

// ── Composant ScreenHeader partagé ────────────────────────────────────────────

function ScreenHeader({
  onBack, title, currentStep, totalSteps,
}: {
  onBack: () => void;
  title: string;
  currentStep: number;
  totalSteps: number;
}) {
  return (
    <View style={hStyles.container}>
      <TouchableOpacity style={hStyles.backBtn} onPress={onBack} accessibilityRole="button" accessibilityLabel="Retour">
        <Ionicons name="chevron-back" size={24} color={DARK_NAVY} />
      </TouchableOpacity>
      <Text style={hStyles.title} numberOfLines={1}>{title}</Text>
      <View style={hStyles.stepBadge}>
        <Text style={hStyles.stepText}>{currentStep}/{totalSteps}</Text>
      </View>
    </View>
  );
}

const hStyles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 8,
  },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 20,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: DARK_NAVY,
    letterSpacing: -0.2,
  },
  stepBadge: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  stepText: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND_BLUE,
  },
});

// ── Composant ProgressBar partagé ─────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = `${(current / total) * 100}%`;
  return (
    <View style={pbStyles.track}>
      <View style={[pbStyles.fill, { width: pct as `${number}%` }]} />
    </View>
  );
}

const pbStyles = StyleSheet.create({
  track: { height: 3, backgroundColor: '#E2E8F0' },
  fill:  { height: 3, backgroundColor: BRAND_BLUE, borderRadius: 2 },
});

// ── Étape 1 : Type d'activité + CGU ───────────────────────────────────────────

function StepProType({ data, onUpdate, onNext, onBack, currentStep, totalSteps }: {
  data: FormData;
  onUpdate: (p: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
  theme: Theme;
}) {
  const canContinue = !!data.proType && data.acceptedTerms;

  return (
    <SafeAreaView style={step1Styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScreenHeader onBack={onBack} title="Type d'activité" currentStep={currentStep} totalSteps={totalSteps} />
      <ProgressBar current={currentStep} total={totalSteps} />
      <ScrollView contentContainerStyle={step1Styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Titre de section */}
        <View style={step1Styles.sectionHeader}>
          <Text style={step1Styles.title}>Choisissez votre activité</Text>
          <Text style={step1Styles.subtitle}>Sélectionnez le profil professionnel qui correspond à votre métier.</Text>
        </View>

        {/* Cartes de choix d'activité */}
        <View style={step1Styles.cardsContainer}>
          {PRO_OPTIONS.map(opt => {
            const selected = data.proType === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[step1Styles.card, selected && step1Styles.cardSelected]}
                onPress={() => onUpdate({ proType: opt.value })}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                activeOpacity={0.75}
              >
                {/* Icône emoji */}
                <View style={[step1Styles.emojiWrap, selected && step1Styles.emojiWrapSelected]}>
                  <Text style={step1Styles.emoji}>{opt.emoji}</Text>
                </View>

                {/* Texte */}
                <View style={step1Styles.cardText}>
                  <Text style={[step1Styles.cardLabel, selected && step1Styles.cardLabelSelected]}>{opt.label}</Text>
                  <Text style={step1Styles.cardDesc}>{opt.description}</Text>
                </View>

                {/* Indicateur de sélection */}
                {selected
                  ? <Ionicons name="checkmark-circle" size={24} color={BRAND_BLUE} />
                  : <Ionicons name="radio-button-off" size={24} color="#CBD5E1" />
                }
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Section CGU */}
        <View style={step1Styles.cguCard}>
          <TouchableOpacity
            style={step1Styles.cguRow}
            onPress={() => onUpdate({ acceptedTerms: !data.acceptedTerms })}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: data.acceptedTerms }}
            activeOpacity={0.7}
          >
            {/* Case à cocher */}
            <View style={[step1Styles.checkbox, data.acceptedTerms && step1Styles.checkboxChecked]}>
              {data.acceptedTerms && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}
            </View>

            {/* Texte CGU avec liens séparés */}
            <View style={step1Styles.cguTextWrap}>
              <Text style={step1Styles.cguText}>
                {'J\'ai lu et j\'accepte les '}
                <Text
                  style={step1Styles.cguLink}
                  onPress={e => {
                    // Empêche le toggle de la checkbox lors du clic sur le lien
                    e.stopPropagation?.();
                    Linking.openURL('https://legal.primeo.ci/cgu/');
                  }}
                  accessibilityRole="link"
                >
                  Conditions Générales d'Utilisation
                </Text>
                {' et la '}
                <Text
                  style={step1Styles.cguLink}
                  onPress={e => {
                    e.stopPropagation?.();
                    Linking.openURL('https://legal.primeo.ci/confidentialite/');
                  }}
                  accessibilityRole="link"
                >
                  Politique de Confidentialité
                </Text>
                {' ainsi que les '}
                <Text
                  style={step1Styles.cguLink}
                  onPress={e => {
                    e.stopPropagation?.();
                    Linking.openURL('https://legal.primeo.ci/professionnels/');
                  }}
                  accessibilityRole="link"
                >
                  Conditions Applicables aux Professionnels
                </Text>
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Bouton continuer */}
        <View style={step1Styles.actions}>
          <TouchableOpacity
            style={[step1Styles.primaryBtn, !canContinue && step1Styles.btnDisabled]}
            onPress={onNext}
            disabled={!canContinue}
            accessibilityRole="button"
            activeOpacity={0.85}
          >
            <Text style={step1Styles.primaryBtnText}>Continuer</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={step1Styles.btnIcon} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const step1Styles = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: '#F8FAFC' },
  scroll:            { flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40, gap: 16 },
  sectionHeader:     { gap: 6 },
  title:             { fontSize: 22, fontWeight: '800', color: DARK_NAVY, letterSpacing: -0.3 },
  subtitle:          { fontSize: 14, color: '#64748B', lineHeight: 21 },
  cardsContainer:    { gap: 10 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardSelected:      { borderColor: BRAND_BLUE, backgroundColor: BLUE_LIGHT },
  emojiWrap: {
    width: 48, height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  emojiWrapSelected: { backgroundColor: 'rgba(16,86,224,0.10)' },
  emoji:             { fontSize: 26 },
  cardText:          { flex: 1, gap: 3 },
  cardLabel:         { fontSize: 15, fontWeight: '700', color: DARK_NAVY },
  cardLabelSelected: { color: BRAND_BLUE },
  cardDesc:          { fontSize: 12, color: '#64748B', lineHeight: 17 },
  cguCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    marginTop: 8,
  },
  cguRow:            { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: {
    width: 24, height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked:   { backgroundColor: BRAND_BLUE, borderColor: BRAND_BLUE },
  cguTextWrap:       { flex: 1 },
  cguText:           { fontSize: 13, color: '#475569', lineHeight: 20 },
  cguLink:           { color: BRAND_BLUE, fontWeight: '700' },
  actions:           { marginTop: 4, gap: 10 },
  primaryBtn: {
    backgroundColor: BRAND_BLUE,
    paddingVertical: 17,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  btnDisabled:       { opacity: 0.4, shadowOpacity: 0 },
  primaryBtnText:    { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  btnIcon:           { marginLeft: 8 },
});

// ── Étape 2 : Informations personnelles ───────────────────────────────────────

function StepPersonalInfo({ data, onUpdate, onNext, onBack, currentStep, totalSteps }: {
  data: FormData;
  onUpdate: (p: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
  theme: Theme;
}) {
  const [showPw, setShowPw]     = useState(false);
  const [showCpw, setShowCpw]   = useState(false);
  const [touched, setTouched]   = useState<Record<string, boolean>>({});
  const touch = (f: string) => setTouched(p => ({ ...p, [f]: true }));

  // Validation de chaque champ
  const errors: Record<string, string | null> = {
    firstName:       !data.firstName.trim() ? 'Champ requis' : null,
    lastName:        !data.lastName.trim() ? 'Champ requis' : null,
    email:           !data.email.trim() ? 'Champ requis' : !/^\S+@\S+\.\S+$/.test(data.email) ? 'Email invalide' : null,
    phone:           !data.phone.trim() ? 'Champ requis' : !isValidIvorianPhone(data.phone) ? 'Numéro ivoirien invalide' : null,
    password:        validatePassword(data.password),
    confirmPassword: !data.confirmPassword ? 'Champ requis' : data.password !== data.confirmPassword ? 'Les mots de passe ne correspondent pas' : null,
  };
  const canSubmit = Object.values(errors).every(e => e === null);

  // Vérifie chaque règle du mot de passe pour l'indicateur visuel
  const pwRules = [
    { label: '8 caractères minimum', ok: data.password.length >= 8 },
    { label: '1 lettre majuscule',    ok: /[A-Z]/.test(data.password) },
    { label: '1 chiffre',             ok: /[0-9]/.test(data.password) },
  ];

  const handleNext = () => {
    setTouched({ firstName: true, lastName: true, email: true, phone: true, password: true, confirmPassword: true });
    if (canSubmit) onNext();
  };

  return (
    <SafeAreaView style={step2Styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScreenHeader onBack={onBack} title="Informations personnelles" currentStep={currentStep} totalSteps={totalSteps} />
      <ProgressBar current={currentStep} total={totalSteps} />
      <ScrollView contentContainerStyle={step2Styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Titre de section */}
        <View style={step2Styles.sectionHeader}>
          <Text style={step2Styles.title}>Informations personnelles</Text>
          <Text style={step2Styles.subtitle}>Ces informations seront utilisées pour votre compte Primeo professionnel.</Text>
        </View>

        {/* Champ Prénom */}
        <View style={step2Styles.field}>
          <Text style={step2Styles.label}>Prénom</Text>
          <TextInput
            style={[step2Styles.input, touched.firstName && errors.firstName ? step2Styles.inputError : null]}
            value={data.firstName}
            onChangeText={v => onUpdate({ firstName: v })}
            onBlur={() => touch('firstName')}
            autoCapitalize="words"
            returnKeyType="next"
            accessibilityLabel="Prénom"
            placeholderTextColor="#94A3B8"
            placeholder="Votre prénom"
          />
          {touched.firstName && errors.firstName ? <Text style={step2Styles.errorMsg}>{errors.firstName}</Text> : null}
        </View>

        {/* Champ Nom */}
        <View style={step2Styles.field}>
          <Text style={step2Styles.label}>Nom</Text>
          <TextInput
            style={[step2Styles.input, touched.lastName && errors.lastName ? step2Styles.inputError : null]}
            value={data.lastName}
            onChangeText={v => onUpdate({ lastName: v })}
            onBlur={() => touch('lastName')}
            autoCapitalize="words"
            returnKeyType="next"
            accessibilityLabel="Nom"
            placeholderTextColor="#94A3B8"
            placeholder="Votre nom"
          />
          {touched.lastName && errors.lastName ? <Text style={step2Styles.errorMsg}>{errors.lastName}</Text> : null}
        </View>

        {/* Champ Email */}
        <View style={step2Styles.field}>
          <Text style={step2Styles.label}>Adresse e-mail</Text>
          <TextInput
            style={[step2Styles.input, touched.email && errors.email ? step2Styles.inputError : null]}
            value={data.email}
            onChangeText={v => onUpdate({ email: v })}
            onBlur={() => touch('email')}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
            accessibilityLabel="Adresse e-mail"
            placeholderTextColor="#94A3B8"
            placeholder="exemple@domaine.com"
          />
          {touched.email && errors.email ? <Text style={step2Styles.errorMsg}>{errors.email}</Text> : null}
        </View>

        {/* Champ Téléphone avec préfixe +225 */}
        <View style={step2Styles.field}>
          <Text style={step2Styles.label}>Téléphone</Text>
          <View style={[step2Styles.phoneRow, touched.phone && errors.phone ? step2Styles.inputError : null]}>
            <View style={step2Styles.phonePrefix}>
              <Text style={step2Styles.phonePrefixText}>+225</Text>
            </View>
            <View style={step2Styles.phoneDivider} />
            <TextInput
              style={step2Styles.phoneInput}
              value={data.phone}
              onChangeText={v => onUpdate({ phone: v })}
              onBlur={() => touch('phone')}
              keyboardType="phone-pad"
              returnKeyType="next"
              accessibilityLabel="Numéro de téléphone"
              placeholderTextColor="#94A3B8"
              placeholder="07 XX XX XX XX"
            />
          </View>
          {touched.phone && errors.phone ? <Text style={step2Styles.errorMsg}>{errors.phone}</Text> : null}
        </View>

        {/* Champ Mot de passe avec eye toggle */}
        <View style={step2Styles.field}>
          <Text style={step2Styles.label}>Mot de passe</Text>
          <View style={[step2Styles.pwRow, touched.password && errors.password ? step2Styles.inputError : null]}>
            <TextInput
              style={step2Styles.pwInput}
              value={data.password}
              onChangeText={v => onUpdate({ password: v })}
              onBlur={() => touch('password')}
              secureTextEntry={!showPw}
              textContentType="newPassword"
              returnKeyType="next"
              accessibilityLabel="Mot de passe"
              placeholderTextColor="#94A3B8"
              placeholder="Minimum 8 caractères"
            />
            <TouchableOpacity style={step2Styles.eyeBtn} onPress={() => setShowPw(v => !v)} accessibilityLabel={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
          {touched.password && errors.password ? <Text style={step2Styles.errorMsg}>{errors.password}</Text> : null}

          {/* Indicateur des règles du mot de passe */}
          <View style={step2Styles.rulesBox}>
            {pwRules.map(r => (
              <View key={r.label} style={step2Styles.ruleRow}>
                <Ionicons
                  name={r.ok ? 'checkmark-circle' : 'close-circle-outline'}
                  size={14}
                  color={r.ok ? '#22C55E' : '#94A3B8'}
                />
                <Text style={[step2Styles.ruleText, r.ok && step2Styles.ruleTextOk]}>{r.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Champ Confirmer mot de passe */}
        <View style={step2Styles.field}>
          <Text style={step2Styles.label}>Confirmer le mot de passe</Text>
          <View style={[step2Styles.pwRow, touched.confirmPassword && errors.confirmPassword ? step2Styles.inputError : null]}>
            <TextInput
              style={step2Styles.pwInput}
              value={data.confirmPassword}
              onChangeText={v => onUpdate({ confirmPassword: v })}
              onBlur={() => touch('confirmPassword')}
              secureTextEntry={!showCpw}
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleNext}
              accessibilityLabel="Confirmer le mot de passe"
              placeholderTextColor="#94A3B8"
              placeholder="Répétez votre mot de passe"
            />
            <TouchableOpacity style={step2Styles.eyeBtn} onPress={() => setShowCpw(v => !v)} accessibilityLabel={showCpw ? 'Masquer' : 'Afficher'}>
              <Ionicons name={showCpw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
          {touched.confirmPassword && errors.confirmPassword ? <Text style={step2Styles.errorMsg}>{errors.confirmPassword}</Text> : null}
        </View>

        {/* Bouton continuer */}
        <View style={step2Styles.actions}>
          <TouchableOpacity
            style={step2Styles.primaryBtn}
            onPress={handleNext}
            accessibilityRole="button"
            activeOpacity={0.85}
          >
            <Text style={step2Styles.primaryBtnText}>Continuer</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={step2Styles.btnIcon} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const step2Styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#FFFFFF' },
  scroll:          { flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40, gap: 16 },
  sectionHeader:   { gap: 6, marginBottom: 4 },
  title:           { fontSize: 22, fontWeight: '800', color: DARK_NAVY, letterSpacing: -0.3 },
  subtitle:        { fontSize: 14, color: '#64748B', lineHeight: 21 },
  field:           { gap: 6 },
  label:           { fontSize: 14, fontWeight: '600', color: DARK_NAVY },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: DARK_NAVY,
    backgroundColor: '#FAFAFA',
  },
  inputError:      { borderColor: '#EF4444' },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
  },
  phonePrefix:     { paddingHorizontal: 12, paddingVertical: 13 },
  phonePrefixText: { fontSize: 15, fontWeight: '600', color: DARK_NAVY },
  phoneDivider:    { width: 1, height: 22, backgroundColor: '#E2E8F0' },
  phoneInput:      { flex: 1, paddingHorizontal: 12, paddingVertical: 13, fontSize: 15, color: DARK_NAVY },
  pwRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
  },
  pwInput:         { flex: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: DARK_NAVY },
  eyeBtn:          { paddingHorizontal: 12, paddingVertical: 13 },
  rulesBox:        { gap: 5, marginTop: 4 },
  ruleRow:         { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ruleText:        { fontSize: 12, color: '#94A3B8' },
  ruleTextOk:      { color: '#22C55E' },
  errorMsg:        { fontSize: 12, color: '#EF4444', marginTop: 2 },
  actions:         { marginTop: 8, gap: 10 },
  primaryBtn: {
    backgroundColor: BRAND_BLUE,
    paddingVertical: 17,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryBtnText:  { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  btnIcon:         { marginLeft: 8 },
});

// ── Étape 3 : Informations professionnelles + soumission ──────────────────────

function StepProInfo({ data, onUpdate, onBack, currentStep, totalSteps, navigation }: {
  data: FormData;
  onUpdate: (p: Partial<FormData>) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
  theme: Theme;
  navigation: Props['navigation'];
}) {
  const setUser   = useAuthStore(st => st.setUser);
  const setTokens = useAuthStore(st => st.setTokens);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Label dynamique selon le type de professionnel
  const isRestaurant = data.proType === 'restaurateur';

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const phone = normalizeIvorianPhone(data.phone) ?? data.phone;
      const payload: Record<string, unknown> = {
        firstName:   data.firstName.trim(),
        lastName:    data.lastName.trim(),
        email:       data.email.trim().toLowerCase(),
        phone,
        password:    data.password,
        accountType: data.proType,
      };
      if (data.businessName.trim())    payload.businessName    = data.businessName.trim();
      if (data.businessAddress.trim()) payload.businessAddress = data.businessAddress.trim();
      if (data.rccm.trim())            payload.rccm            = data.rccm.trim();
      if (data.taxNumber.trim())       payload.taxNumber       = data.taxNumber.trim();
      if (data.referralCode.trim())    payload.referralCode    = data.referralCode.trim();

      const res = await authApi.register(payload);
      // Statistique anonyme d'inscription professionnelle
      trackEvent('signup', { type: 'professional' });
      const resData = res.data as {
        message?: string; accessToken?: string; refreshToken?: string;
        user?: Parameters<typeof setUser>[0];
      };

      if (resData.accessToken && resData.refreshToken && resData.user) {
        // Mode bypass : stocker les tokens et connecter directement
        await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN,  resData.accessToken);
        await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, resData.refreshToken);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(resData.user));
        setTokens(resData.accessToken, resData.refreshToken);
        setUser(resData.user);
        return;
      }

      navigation.navigate('OtpVerification', { phone, context: 'registration' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } }; message?: string };
      setError(e?.response?.data?.error ?? e?.response?.data?.message ?? 'Erreur lors de la création du compte. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={step3Styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScreenHeader onBack={onBack} title="Informations pro" currentStep={currentStep} totalSteps={totalSteps} />
      <ProgressBar current={currentStep} total={totalSteps} />
      <ScrollView contentContainerStyle={step3Styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Titre de section */}
        <View style={step3Styles.sectionHeader}>
          <Text style={step3Styles.title}>Informations professionnelles</Text>
          <Text style={step3Styles.subtitle}>Champs optionnels — complétables ultérieurement.</Text>
        </View>

        {/* Bannière d'information */}
        <View style={step3Styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={BRAND_BLUE} />
          <Text style={step3Styles.infoText}>Ces informations apparaîtront sur votre profil professionnel Primeo.</Text>
        </View>

        {/* Message d'erreur serveur */}
        {error ? (
          <View style={step3Styles.errorBox} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
            <Text style={step3Styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Champ Dénomination sociale / Nom restaurant */}
        <View style={step3Styles.field}>
          <Text style={step3Styles.label}>
            {isRestaurant ? 'Nom du restaurant' : 'Dénomination sociale'}
            {'  '}<Text style={step3Styles.optional}>(optionnel)</Text>
          </Text>
          <TextInput
            style={step3Styles.input}
            value={data.businessName}
            onChangeText={v => onUpdate({ businessName: v })}
            autoCapitalize="words"
            returnKeyType="next"
            accessibilityLabel="Nom de l'établissement"
            placeholderTextColor="#94A3B8"
            placeholder={isRestaurant ? 'Ex. : Le Jardin Tropical' : 'Ex. : Primeo Résidences SARL'}
          />
        </View>

        {/* Champ Adresse */}
        <View style={step3Styles.field}>
          <Text style={step3Styles.label}>
            Adresse de l'établissement
            {'  '}<Text style={step3Styles.optional}>(optionnel)</Text>
          </Text>
          <TextInput
            style={step3Styles.input}
            value={data.businessAddress}
            onChangeText={v => onUpdate({ businessAddress: v })}
            autoCapitalize="sentences"
            returnKeyType="next"
            accessibilityLabel="Adresse de l'établissement"
            placeholderTextColor="#94A3B8"
            placeholder="Ex. : Cocody, Abidjan"
          />
        </View>

        {/* Champ RCCM */}
        <View style={step3Styles.field}>
          <Text style={step3Styles.label}>
            Numéro RCCM
            {'  '}<Text style={step3Styles.optional}>(optionnel)</Text>
          </Text>
          <TextInput
            style={step3Styles.input}
            value={data.rccm}
            onChangeText={v => onUpdate({ rccm: v })}
            autoCapitalize="characters"
            returnKeyType="next"
            accessibilityLabel="Numéro RCCM"
            placeholderTextColor="#94A3B8"
            placeholder="Ex. : CI-ABJ-01-2023-B12-00123"
          />
        </View>

        {/* Champ Numéro de contribuable */}
        <View style={step3Styles.field}>
          <Text style={step3Styles.label}>
            Numéro de contribuable
            {'  '}<Text style={step3Styles.optional}>(optionnel)</Text>
          </Text>
          <TextInput
            style={step3Styles.input}
            value={data.taxNumber}
            onChangeText={v => onUpdate({ taxNumber: v })}
            autoCapitalize="characters"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            accessibilityLabel="Numéro de contribuable"
            placeholderTextColor="#94A3B8"
            placeholder="Ex. : 1234567A"
          />
        </View>

        {/* Champ Code de parrainage */}
        <View style={step3Styles.field}>
          <Text style={step3Styles.label}>
            Code de parrainage
            {'  '}<Text style={step3Styles.optional}>(optionnel)</Text>
          </Text>
          <TextInput
            style={step3Styles.input}
            value={data.referralCode}
            onChangeText={v => onUpdate({ referralCode: v })}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            accessibilityLabel="Code de parrainage"
            placeholderTextColor="#94A3B8"
            placeholder="Code de la personne qui vous a invité"
          />
        </View>

        {/* Bouton de soumission */}
        <View style={step3Styles.actions}>
          <TouchableOpacity
            style={[step3Styles.primaryBtn, loading && step3Styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            accessibilityRole="button"
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={step3Styles.btnIconLeft} />
                <Text style={step3Styles.primaryBtnText}>Créer mon compte professionnel</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onBack} disabled={loading} accessibilityRole="button" style={step3Styles.backBtn}>
            <Text style={step3Styles.backBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const step3Styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#FFFFFF' },
  scroll:        { flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40, gap: 16 },
  sectionHeader: { gap: 6, marginBottom: 4 },
  title:         { fontSize: 22, fontWeight: '800', color: DARK_NAVY, letterSpacing: -0.3 },
  subtitle:      { fontSize: 14, color: '#64748B', lineHeight: 21 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: BLUE_LIGHT,
    borderRadius: 12,
    padding: 12,
  },
  infoText:      { flex: 1, fontSize: 13, color: BRAND_BLUE, lineHeight: 19 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
  },
  errorText:     { flex: 1, fontSize: 13, color: '#EF4444', lineHeight: 19 },
  field:         { gap: 6 },
  label:         { fontSize: 14, fontWeight: '600', color: DARK_NAVY },
  optional:      { fontSize: 13, fontWeight: '400', color: '#94A3B8' },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: DARK_NAVY,
    backgroundColor: '#FAFAFA',
  },
  actions:       { marginTop: 8, gap: 12 },
  primaryBtn: {
    backgroundColor: BRAND_BLUE,
    paddingVertical: 17,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  btnDisabled:   { opacity: 0.5, shadowOpacity: 0 },
  btnIconLeft:   { marginRight: 8 },
  primaryBtnText:{ color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  backBtn:       { alignItems: 'center', paddingVertical: 12 },
  backBtnText:   { fontSize: 14, fontWeight: '600', color: '#64748B' },
});
