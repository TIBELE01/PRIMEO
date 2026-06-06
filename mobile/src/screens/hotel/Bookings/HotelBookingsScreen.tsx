import React from 'react';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { EmptyState } from '../../../components/ui/EmptyState';
export default function HotelBookingsScreen() {
  return <ScreenWrapper><EmptyState icon="📅" title="Réservations hôtel" subtitle="Aucune réservation en cours" /></ScreenWrapper>;
}
