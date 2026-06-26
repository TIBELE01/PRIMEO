// HomeFooter — pied de page partagé entre HomeScreen (client connecté) et
// PublicHomeScreen (visiteur). Source unique de vérité pour les liens vers le
// site vitrine : toute mise à jour d'URL se fait ici, jamais en double.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Image } from 'react-native';
import { PRIMEO_LOGO_URL } from '../../../components/common/Logo';

const VITRINE = 'https://primeo-vitrine.onrender.com';
const LEGAL = 'https://legal.primeo.ci';

type Link = { label: string; url: string };

const FOOTER_PRODUIT: Link[] = [
  { label: 'Solutions',          url: `${VITRINE}/solutions/` },
  { label: 'Produits',           url: `${VITRINE}/produits/` },
  { label: 'Tarification',       url: `${VITRINE}/tarification/` },
  { label: 'Télécharger l\'app', url: `${VITRINE}/telechargement/` },
];
const FOOTER_ENTREPRISE: Link[] = [
  { label: 'À propos',           url: `${VITRINE}/a-propos/` },
  { label: 'Engagement RSE',     url: `${VITRINE}/engagement/` },
  { label: 'Carrières',          url: `${VITRINE}/carrieres/` },
  { label: 'Blog',               url: `${VITRINE}/blog/` },
  { label: 'Espace presse',      url: `${VITRINE}/espace-presse/` },
  { label: 'Contact',            url: `${VITRINE}/contact/` },
  { label: 'Devenir partenaire', url: `${VITRINE}/devenir-partenaire/` },
  { label: 'Communauté',         url: `${VITRINE}/communaute/` },
];
const FOOTER_SUPPORT: Link[] = [
  { label: 'Tarification',       url: `${VITRINE}/tarification/` },
  { label: 'Documentation',      url: `${VITRINE}/documentation/` },
  { label: 'Centre d\'aide',     url: `${VITRINE}/aide/` },
  { label: 'Contact',            url: `${VITRINE}/contact/` },
];
const FOOTER_LEGAL: Link[] = [
  { label: 'Mentions légales',              url: `${LEGAL}/mentions-legales/` },
  { label: 'Confidentialité',               url: `${LEGAL}/confidentialite/` },
  { label: 'CGU',                           url: `${LEGAL}/cgu/` },
  { label: 'Conditions de vente',           url: `${LEGAL}/conditions-vente/` },
  { label: 'Professionnels',                url: `${LEGAL}/professionnels/` },
  { label: 'Litiges & Médiation',           url: `${LEGAL}/litiges-mediation/` },
  { label: 'Tous les documents',            url: `${LEGAL}/` },
];
const SOCIAL_LINKS: Link[] = [
  { label: 'LinkedIn',  url: 'https://linkedin.com/company/primeo-ci' },
  { label: 'X',         url: 'https://twitter.com/primeoci' },
  { label: 'Facebook',  url: 'https://facebook.com/primeoci' },
  { label: 'Instagram', url: 'https://instagram.com/primeoci' },
  { label: 'TikTok',    url: 'https://tiktok.com/@primeoci' },
];

const open = (url: string) => Linking.openURL(url).catch(() => null);

function Column({ title, links }: { title: string; links: Link[] }) {
  return (
    <>
      <Text style={s.footerColTitle}>{title}</Text>
      {links.map(l => (
        <TouchableOpacity key={l.label} onPress={() => open(l.url)}>
          <Text style={s.footerLink}>{l.label}</Text>
        </TouchableOpacity>
      ))}
    </>
  );
}

export function HomeFooter({ onBecomePro }: { onBecomePro?: () => void } = {}) {
  return (
    <View style={s.footer}>
      <TouchableOpacity
        style={s.proCtaBtn}
        onPress={onBecomePro ?? (() => open(`${VITRINE}/professionnels/`))}
        accessibilityRole="button"
      >
        <Text style={s.proCtaIcon}>🏢</Text>
        <View style={s.proCtaText}>
          <Text style={s.proCtaTitle}>Devenir professionnel sur Primeo</Text>
          <Text style={s.proCtaDesc}>Publiez vos annonces et développez votre activité</Text>
        </View>
        <Text style={s.proCtaArrow}>›</Text>
      </TouchableOpacity>

      <View style={s.footerBrand}>
        <Image source={{ uri: PRIMEO_LOGO_URL }} resizeMode="contain" style={s.footerLogoImg} />
        <Text style={s.footerBrandSub}>Hébergement · Côte d'Ivoire</Text>
      </View>
      <Text style={s.footerDesc}>
        La plateforme de réservation d'hébergement et de mise en relation pour voyageurs, hôteliers, restaurateurs et professionnels de l'immobilier en Côte d'Ivoire.
      </Text>

      <View style={s.footerSep} />

      <View style={s.footerColumns}>
        <View style={s.footerCol}><Column title="Produit" links={FOOTER_PRODUIT} /></View>
        <View style={s.footerCol}><Column title="Entreprise" links={FOOTER_ENTREPRISE} /></View>
        <View style={s.footerCol}>
          <Column title="Support" links={FOOTER_SUPPORT} />
          <View style={{ marginTop: 14 }}>
            <Column title="Légal" links={FOOTER_LEGAL} />
          </View>
        </View>
      </View>

      <View style={s.footerSep} />

      <Text style={s.footerContact}>📧  contact@primeo.ci</Text>
      <Text style={s.footerContact}>📞  +225 07 00 00 00 00</Text>
      <Text style={s.footerContact}>📍  Plateau, Abidjan, Côte d'Ivoire</Text>

      <View style={s.footerSep} />

      <View style={s.socialRow}>
        {SOCIAL_LINKS.map(sl => (
          <TouchableOpacity key={sl.label} style={s.socialBtn} onPress={() => open(sl.url)} activeOpacity={0.75}>
            <Text style={s.socialLabel}>{sl.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.footerSep} />

      <Text style={s.footerCopy}>© {new Date().getFullYear()} Primeo CI. Tous droits réservés.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  footer:        { backgroundColor: '#000', paddingHorizontal: 22, paddingTop: 28, paddingBottom: 40 },
  proCtaBtn:     { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)', borderRadius: 14, padding: 14, marginBottom: 20 },
  proCtaIcon:    { fontSize: 28 },
  proCtaText:    { flex: 1, gap: 2 },
  proCtaTitle:   { fontSize: 14, fontWeight: '800', color: '#fff' },
  proCtaDesc:    { fontSize: 12, color: 'rgba(255,255,255,0.62)' },
  proCtaArrow:   { fontSize: 20, color: 'rgba(255,255,255,0.50)', fontWeight: '700' },
  footerBrand:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  footerLogoImg:  { width: 48, height: 48 },
  footerBrandSub: { fontSize: 11, color: 'rgba(255,255,255,0.55)' },
  footerDesc:       { fontSize: 12.5, color: 'rgba(255,255,255,0.65)', lineHeight: 19, marginBottom: 4 },
  footerSep:        { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 18 },
  footerColumns:    { flexDirection: 'row', gap: 16 },
  footerCol:        { flex: 1, gap: 7 },
  footerColTitle:   { fontSize: 11.5, fontWeight: '800', color: '#fff', letterSpacing: 0.6, marginBottom: 4, textTransform: 'uppercase' },
  footerLink:       { fontSize: 12, color: 'rgba(255,255,255,0.62)', lineHeight: 20 },
  footerContact:    { fontSize: 12.5, color: 'rgba(255,255,255,0.72)', marginBottom: 6, lineHeight: 20 },
  socialRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  socialBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)',
    borderRadius: 999,
  },
  socialLabel: { fontSize: 12, fontWeight: '700', color: '#fff' },
  footerCopy:  { fontSize: 11.5, color: 'rgba(255,255,255,0.40)', textAlign: 'center', marginTop: 4 },
});
