// FileUploader: single file picker for KYC documents (PDF / image)
import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';

interface FileUploaderProps {
  label: string;
  fileName?: string;
  onPick: () => void;
  error?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ label, fileName, onPick, error }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={[styles.btn, !!error && styles.errorBorder]} onPress={onPick}>
        <Text style={styles.icon}>📎</Text>
        <Text style={styles.text}>{fileName ?? 'Choisir un fichier'}</Text>
      </TouchableOpacity>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: '#ddd', borderStyle: 'dashed', borderRadius: 10, padding: 14 },
  errorBorder: { borderColor: '#B71C1C' },
  icon: { fontSize: 18 },
  text: { fontSize: 14, color: '#555' },
  error: { color: '#B71C1C', fontSize: 12, marginTop: 4 },
});
