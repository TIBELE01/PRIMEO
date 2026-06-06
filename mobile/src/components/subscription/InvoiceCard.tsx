// InvoiceCard: invoice list item with download button
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface InvoiceCardProps {
  invoiceId: string;
  date: string;
  amount: number;
  plan: string;
  onDownload: () => void;
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({ invoiceId, date, amount, plan, onDownload }) => (
  <View style={styles.card}>
    <View style={styles.info}>
      <Text style={styles.plan}>{plan}</Text>
      <Text style={styles.date}>{date}</Text>
      <Text style={styles.id}>#{invoiceId}</Text>
    </View>
    <View style={styles.right}>
      <Text style={styles.amount}>{amount.toLocaleString()} XOF</Text>
      <TouchableOpacity style={styles.downloadBtn} onPress={onDownload}>
        <Text style={styles.downloadText}>📄 Télécharger</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, elevation: 1, alignItems: 'center' },
  info: { flex: 1 },
  plan: { fontWeight: '700', fontSize: 14, color: '#1056E0' },
  date: { fontSize: 12, color: '#777', marginTop: 2 },
  id: { fontSize: 11, color: '#aaa', marginTop: 1 },
  right: { alignItems: 'flex-end', gap: 8 },
  amount: { fontWeight: '700', fontSize: 14 },
  downloadBtn: { backgroundColor: '#EFF5FF', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  downloadText: { color: '#1056E0', fontSize: 12, fontWeight: '600' },
});
