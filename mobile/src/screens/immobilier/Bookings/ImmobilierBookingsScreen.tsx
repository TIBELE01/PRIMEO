import React from 'react'; import { ScreenWrapper } from '../../../components/layout/ScreenWrapper'; import { EmptyState } from '../../../components/ui/EmptyState';
export default function ImmobilierBookingsScreen() { return (<ScreenWrapper><EmptyState icon="📅" title="Locations" subtitle="Aucune location en cours" /></ScreenWrapper>); }
