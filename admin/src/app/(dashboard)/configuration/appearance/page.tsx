'use client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { useState } from 'react';

export default function AppearancePage() {
  const toast = useToast();
  const [primary, setPrimary] = useState('#1B5E20');
  const [gold, setGold] = useState('#F9A825');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    toast.success('Apparence sauvegardée');
    setSaving(false);
  };

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900">Apparence</h1>
      <Card>
        <CardHeader><CardTitle>Couleurs de la marque</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-12 h-10 rounded cursor-pointer border" />
              <div>
                <p className="text-sm font-medium text-gray-900">Couleur principale</p>
                <p className="text-xs text-gray-500">{primary}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <input type="color" value={gold} onChange={(e) => setGold(e.target.value)} className="w-12 h-10 rounded cursor-pointer border" />
              <div>
                <p className="text-sm font-medium text-gray-900">Couleur accent (or)</p>
                <p className="text-xs text-gray-500">{gold}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Button loading={saving} onClick={save}>Sauvegarder</Button>
    </div>
  );
}
