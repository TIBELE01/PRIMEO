import React from 'react'; import { StatsCard } from '../../../components/dashboard/StatsCard';
export const BookingStats: React.FC = () => (<StatsCard title="Statistiques réservations" stats={[{ label: 'Tables réservées', value: '0' }, { label: 'Taux d\'occupation', value: '0%' }, { label: 'Avis moyen', value: '0/5' }]} />);
