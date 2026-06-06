import React from 'react'; import { ScreenWrapper } from '../../../components/layout/ScreenWrapper'; import { EmptyState } from '../../../components/ui/EmptyState';
export default function HotelMessagesScreen() { return (<ScreenWrapper><EmptyState icon="💬" title="Messagerie hôtel" subtitle="Vos conversations apparaîtront ici" /></ScreenWrapper>); }
