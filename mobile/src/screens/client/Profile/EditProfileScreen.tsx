// EditProfileScreen: edit name, phone, and profile picture
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { FormInput } from '../../../components/form/FormInput';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../hooks/useAuth';
import { usersApi } from '../../../services/api/endpoints/users';

export default function EditProfileScreen() {
  const { user, setUser } = useAuth();
  const [firstName, setFirstName] = useState((user as any)?.firstName ?? '');
  const [lastName, setLastName] = useState((user as any)?.lastName ?? '');
  const [phone, setPhone] = useState((user as any)?.phone ?? '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await usersApi.updateProfile({ firstName, lastName, phone });
      setUser(res.data.data);
      Alert.alert('Succès', 'Profil mis à jour');
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.message ?? 'Erreur serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.content}>
        <FormInput label="Prénom" value={firstName} onChangeText={setFirstName} />
        <FormInput label="Nom" value={lastName} onChangeText={setLastName} />
        <FormInput label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Button title="Enregistrer" onPress={handleSave} loading={loading} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({ content: { padding: 20 } });
