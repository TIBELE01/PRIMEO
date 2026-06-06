import React, { useState } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, Linking, View, Platform } from 'react-native';
import { apiClient } from '../../services/api/client';

interface Props { bookingId: string; }

function openUrl(url: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    Linking.openURL(url).catch(() => undefined);
  }
}

export const BookingInvoiceDownload: React.FC<Props> = ({ bookingId }) => {
  const [loading, setLoading] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDownload = async () => {
    if (invoiceUrl) { openUrl(invoiceUrl); return; }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.get(`/bookings/${bookingId}/invoice`);
      const url: string = res?.data?.invoiceUrl ?? res?.data?.url ?? res?.data?.data?.invoiceUrl;
      if (url) {
        setInvoiceUrl(url);
        openUrl(url);
      } else {
        setErrorMsg('La facture a été envoyée par email lors de la confirmation. Vérifiez votre boîte de réception.');
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? null;
      setErrorMsg(msg ?? 'La facture a été envoyée par email lors de la confirmation. Vérifiez votre boîte de réception.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <TouchableOpacity style={styles.btn} onPress={handleDownload} disabled={loading} activeOpacity={0.85}>
        {loading
          ? <ActivityIndicator color="#1056E0" />
          : (
            <View style={styles.inner}>
              <Text style={styles.icon}>📄</Text>
              <Text style={styles.txt}>Télécharger la facture PDF</Text>
            </View>
          )}
      </TouchableOpacity>
      {invoiceUrl && (
        <TouchableOpacity onPress={() => openUrl(invoiceUrl!)}>
          <Text style={styles.openAgain}>Ouvrir à nouveau ↗</Text>
        </TouchableOpacity>
      )}
      {errorMsg && <Text style={styles.errorMsg}>{errorMsg}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  btn: { borderWidth: 1.5, borderColor: '#1056E0', borderRadius: 12, padding: 14, alignItems: 'center', backgroundColor: '#F0FDF4' },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { fontSize: 18 },
  txt: { color: '#1056E0', fontWeight: '700', fontSize: 14 },
  openAgain: { color: '#1056E0', fontSize: 12, textAlign: 'center', marginTop: 6, fontWeight: '600' },
  errorMsg: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 17 },
});
