'use client';
// Charge la configuration plateforme (GET /admin/config) une seule fois et
// l'injecte dans le store avant d'afficher les sous-pages de configuration.
// Sans ce chargement, toutes les pages affichaient les valeurs PAR DÉFAUT et ne
// reflétaient jamais les réglages réellement enregistrés en base.
import { useEffect, useState } from 'react';
import { configService } from '@/services/api';
import { useConfigStore } from '@/stores/configStore';

export default function ConfigurationLayout({ children }: { children: React.ReactNode }) {
  const hydrate = useConfigStore((s) => s.hydrate);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await configService.getConfig();
        if (active) hydrate(raw as Record<string, unknown>);
      } catch {
        // En cas d'échec réseau, on garde les valeurs par défaut déjà présentes
        // dans le store (l'UI reste utilisable, la sauvegarde reste possible).
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => { active = false; };
  }, [hydrate]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary-600" />
      </div>
    );
  }

  return <>{children}</>;
}
