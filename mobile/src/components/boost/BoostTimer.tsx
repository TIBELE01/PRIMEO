// BoostTimer: countdown timer showing remaining time on an active boost
import React, { useState, useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';

interface BoostTimerProps {
  expiresAt: string;
}

export const BoostTimer: React.FC<BoostTimerProps> = ({ expiresAt }) => {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Expiré'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${h}h ${m}m`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return <Text style={styles.text}>⏱ {remaining}</Text>;
};

const styles = StyleSheet.create({
  text: { color: '#D67309', fontWeight: '600', fontSize: 13 },
});
