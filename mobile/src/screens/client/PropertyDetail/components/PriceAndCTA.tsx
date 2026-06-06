import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useCurrency } from '../../../../hooks/useCurrency';

interface Props {
  pricePerNight: number | null;
  priceForSale: number | null;
  propertyType: string;
  onBook: () => void;
  selectedDates?: { checkIn: string; checkOut: string } | null;
}

const nightsBetween = (a: string, b: string) =>
  Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));

export function PriceAndCTA({ pricePerNight, priceForSale, propertyType, onBook, selectedDates }: Props) {
  const { formatPrice, isIndicative, rateDate } = useCurrency();
  const isRealEstate = propertyType === 'real_estate';
  const isRestaurant = propertyType === 'restaurant';

  const nights = selectedDates ? nightsBetween(selectedDates.checkIn, selectedDates.checkOut) : 1;
  const total = selectedDates && pricePerNight ? pricePerNight * nights : null;

  const ctaLabel = isRealEstate ? 'Exprimer mon intérêt' : isRestaurant ? 'Réserver une table' : 'Réserver';

  return (
    <View style={styles.bar}>
      <View style={styles.priceWrap}>
        {pricePerNight != null && !isRealEstate && (
          <>
            <Text style={styles.price}>{formatPrice(pricePerNight)}</Text>
            <Text style={styles.perNight}>/ nuit</Text>
          </>
        )}
        {priceForSale != null && isRealEstate && (
          <Text style={styles.price}>{formatPrice(priceForSale)}</Text>
        )}
        {total != null && (
          <Text style={styles.total}>{nights} nuit{nights > 1 ? 's' : ''} = {formatPrice(total)}</Text>
        )}
        {isIndicative && (
          <Text style={styles.indicative}>
            Indicatif — paiement en FCFA{rateDate ? ` (taux du ${rateDate})` : ''}
          </Text>
        )}
      </View>
      <TouchableOpacity style={styles.cta} onPress={onBook} activeOpacity={0.85}>
        <Text style={styles.ctaText}>{ctaLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 8,
  },
  priceWrap: { flex: 1 },
  price: { fontSize: 18, fontWeight: '800', color: '#1056E0' },
  perNight: { fontSize: 12, color: '#6B7280' },
  total: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  indicative: { fontSize: 10, color: '#D97706', marginTop: 2 },
  cta: { backgroundColor: '#1056E0', paddingHorizontal: 22, paddingVertical: 13, borderRadius: 14 },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
