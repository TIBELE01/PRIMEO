// NotFoundScreen: 404 fallback screen
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function NotFoundScreen() {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <Text style={styles.code}>404</Text>
      <Text style={styles.title}>Page introuvable</Text>
      <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
        <Text style={styles.btnText}>Retour</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, paddingTop: 48 },
  code: { fontSize: 72, fontWeight: '900', color: '#1056E0', marginBottom: 8 },
  title: { fontSize: 20, color: '#555', marginBottom: 32 },
  btn: { backgroundColor: '#1056E0', borderRadius: 10, paddingHorizontal: 32, paddingVertical: 12 },
  btnText: { color: '#fff', fontWeight: '700' },
});
