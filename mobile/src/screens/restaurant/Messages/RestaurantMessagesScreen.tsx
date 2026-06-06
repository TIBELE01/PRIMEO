import React from 'react'; import { ScreenWrapper } from '../../../components/layout/ScreenWrapper'; import { EmptyState } from '../../../components/ui/EmptyState';
export default function RestaurantMessagesScreen() { return (<ScreenWrapper><EmptyState icon="💬" title="Messagerie restaurant" subtitle="Vos conversations apparaîtront ici" /></ScreenWrapper>); }
