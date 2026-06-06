// LegalLinksScreen — liens vers les documents légaux de PRIMEO
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../../navigation/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type Nav = NativeStackNavigationProp<ClientStackParamList>;

// ── Données des liens légaux ──────────────────────────────────────────────────

const LEGAL_LINKS = [
  {
    id: 'cgu',
    icon: '📋',
    label: "Conditions Générales d'Utilisation",
    description: 'Règles d\'utilisation de la plateforme PRIMEO.',
    url: 'https://primeo-vitrine.onrender.com/legal/cgu.html',
  },
  {
    id: 'confidentialite',
    icon: '🔒',
    label: 'Politique de Confidentialité',
    description: 'Comment nous collectons et protégeons vos données personnelles.',
    url: 'https://primeo-vitrine.onrender.com/legal/confidentialite.html',
  },
  {
    id: 'mentions',
    icon: '🏛️',
    label: 'Mentions Légales',
    description: 'Informations légales sur la société PRIMEO.',
    url: 'https://primeo-vitrine.onrender.com/legal/mentions.html',
  },
  {
    id: 'charte',
    icon: '🤝',
    label: 'Charte de Respect',
    description: 'Engagements envers nos utilisateurs et partenaires.',
    url: 'https://primeo-vitrine.onrender.com/legal/charte.html',
  },
] as const;

// ── Écran ─────────────────────────────────────────────────────────────────────

export default function LegalLinksScreen() {
  const navigation = useNavigation<Nav>();

  /** Ouvre une URL externe avec gestion des erreurs */
  const openUrl = async (url: string, label: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Lien indisponible', `Impossible d'ouvrir : ${label}`);
      }
    } catch {
      Alert.alert('Erreur', `Impossible d'ouvrir le document : ${label}.`);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F6FB" />

      {/* En-tête */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Informations légales</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Introduction */}
        <View style={styles.introCard}>
          <Text style={styles.introIcon}>⚖️</Text>
          <Text style={styles.introText}>
            Retrouvez ici tous les documents légaux encadrant votre utilisation de la plateforme PRIMEO.
          </Text>
        </View>

        {/* Liste des liens */}
        <View style={styles.linksCard}>
          {LEGAL_LINKS.map((link, index) => (
            <TouchableOpacity
              key={link.id}
              style={[
                styles.linkItem,
                index < LEGAL_LINKS.length - 1 && styles.linkItemBorder,
              ]}
              onPress={() => openUrl(link.url, link.label)}
              activeOpacity={0.7}
            >
              <View style={styles.linkIconBox}>
                <Text style={styles.linkIcon}>{link.icon}</Text>
              </View>
              <View style={styles.linkContent}>
                <Text style={styles.linkLabel}>{link.label}</Text>
                <Text style={styles.linkDescription}>{link.description}</Text>
              </View>
              <Text style={styles.linkArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Version et copyright */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>PRIMEO © {new Date().getFullYear()}</Text>
          <Text style={styles.footerSub}>Tous droits réservés</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F6FB' },
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

  // Introduction
  introCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  introIcon: { fontSize: 28 },
  introText: { flex: 1, fontSize: 14, color: '#1E40AF', lineHeight: 20 },

  // Carte de liens
  linksCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 14,
  },
  linkItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  linkIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkIcon: { fontSize: 20 },
  linkContent: { flex: 1 },
  linkLabel: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 3 },
  linkDescription: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  linkArrow: { fontSize: 22, color: '#9CA3AF' },

  // Pied de page
  footer: { alignItems: 'center', paddingTop: 8 },
  footerText: { fontSize: 14, fontWeight: '700', color: '#9CA3AF' },
  footerSub: { fontSize: 12, color: '#D1D5DB', marginTop: 2 },
});
