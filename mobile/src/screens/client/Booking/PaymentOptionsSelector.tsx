// PaymentOptionsSelector: choose between full, 10%, or 0% online payment
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { PaymentOptionCard } from '../../../components/booking/PaymentOptionCard';

interface Props {
  totalAmount: number;
  onSelect: (option: 'full_online' | 'ten_percent_online' | 'zero_online') => void;
  selected: 'full_online' | 'ten_percent_online' | 'zero_online';
}

export const PaymentOptionsSelector: React.FC<Props> = ({ totalAmount, onSelect, selected }) => {
  const tenPercent = Math.round(totalAmount * 0.1);
  const ninetyPercent = totalAmount - tenPercent;

  const options: Array<{
    option: 'full_online' | 'ten_percent_online' | 'zero_online';
    label: string;
    description: string;
    amount: number;
    cashAmount?: number;
    isRecommended?: boolean;
  }> = [
    {
      option: 'full_online',
      label: '100% en ligne',
      description: 'Paiement sécurisé maintenant. Confirmation instantanée.',
      amount: totalAmount,
      cashAmount: 0,
    },
    {
      option: 'ten_percent_online',
      label: '10% en ligne + 90% sur place',
      description: 'Payez seulement 10% maintenant. Solde à régler à l\'arrivée.',
      amount: tenPercent,
      cashAmount: ninetyPercent,
      isRecommended: true,
    },
    {
      option: 'zero_online',
      label: '100% sur place (cash)',
      description: 'Aucun paiement en ligne. Règlement en espèces à l\'arrivée.',
      amount: 0,
      cashAmount: totalAmount,
    },
  ];

  return (
    <View>
      <Text style={styles.title}>Mode de paiement</Text>
      <Text style={styles.subtitle}>Choisissez comment vous souhaitez payer</Text>
      {options.map(opt => (
        <PaymentOptionCard
          key={opt.option}
          testID={`payment-option-${opt.option}`}
          {...opt}
          selected={selected === opt.option}
          onSelect={() => onSelect(opt.option)}
          currency="FCFA"
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 14 },
});
