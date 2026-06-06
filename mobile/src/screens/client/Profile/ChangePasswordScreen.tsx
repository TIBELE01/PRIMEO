// ChangePasswordScreen: form for updating account password
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { FormInput } from '../../../components/form/FormInput';
import { Button } from '../../../components/ui/Button';
import { usersApi } from '../../../services/api/endpoints/users';

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (newPassword !== confirm) { Alert.alert('Erreur', 'Les mots de passe ne correspondent pas'); return; }
    setLoading(true);
    try {
      await usersApi.changePassword({ currentPassword, newPassword });
      Alert.alert('Succès', 'Mot de passe mis à jour');
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.message ?? 'Erreur serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.content}>
        <FormInput label="Mot de passe actuel" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
        <FormInput label="Nouveau mot de passe" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
        <FormInput label="Confirmer le nouveau mot de passe" value={confirm} onChangeText={setConfirm} secureTextEntry />
        <Button title="Mettre à jour" onPress={handleSubmit} loading={loading} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
});
