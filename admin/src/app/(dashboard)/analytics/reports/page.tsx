'use client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import { analyticsService } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { Download } from 'lucide-react';

const reports = [
  { id: 'users', label: 'Rapport utilisateurs', desc: 'Inscriptions, KYC, activité' },
  { id: 'bookings', label: 'Rapport réservations', desc: 'Volume, revenus, secteurs' },
  { id: 'commissions', label: 'Rapport commissions', desc: 'Commissions perçues par période' },
  { id: 'disputes', label: 'Rapport litiges', desc: 'Litiges ouverts, résolus, délais' },
];

export default function ReportsPage() {
  const toast = useToast();
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState<string | null>(null);

  const download = async (reportId: string) => {
    setLoading(reportId);
    try {
      await analyticsService.downloadReport(reportId, period);
      toast.success('Rapport téléchargé');
    } catch {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input w-40">
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
          <option value="quarter">Ce trimestre</option>
          <option value="year">Cette année</option>
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reports.map((r) => (
          <Card key={r.id}>
            <CardHeader><CardTitle>{r.label}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">{r.desc}</p>
              <Button variant="outline" size="sm" leftIcon={<Download size={14} />} loading={loading === r.id} onClick={() => download(r.id)}>
                Télécharger CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
