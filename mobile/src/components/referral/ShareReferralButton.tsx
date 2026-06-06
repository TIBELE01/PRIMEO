// ShareReferralButton: opens native share sheet with referral link
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Share } from 'react-native';

interface ShareReferralButtonProps {
  code: string;
}

export const ShareReferralButton: React.FC<ShareReferralButtonProps> = ({ code }) => {
  const handleShare = async () => {
    await Share.share({
      message: `Rejoins PRIMEO avec mon code ${code} et profite d'une réduction sur ta première réservation ! https://primeo.ci/invite/${code}`,
      title: 'Inviter sur PRIMEO',
    });
  };
  return (
    <TouchableOpacity style={styles.btn} onPress={handleShare}>
      <Text style={styles.text}>📤 Partager mon code</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: { backgroundColor: '#D67309', borderRadius: 12, padding: 14, alignItems: 'center' },
  text: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
