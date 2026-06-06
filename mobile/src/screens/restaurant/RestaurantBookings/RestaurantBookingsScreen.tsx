import React from 'react'; import { ScreenWrapper } from '../../../components/layout/ScreenWrapper'; import { EmptyState } from '../../../components/ui/EmptyState';
export default function RestaurantBookingsScreen() { return (<ScreenWrapper><EmptyState icon="🍽️" title="Réservations" subtitle="Aucune réservation en cours" /></ScreenWrapper>); }
