'use client';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { ToastProvider } from '@/components/ui/Toast';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    // Retour visuel des actions : aucune action ne doit échouer en silence.
    //  - erreur : message de l'API si l'action n'a pas sa propre gestion d'erreur ;
    //  - succès : confirmation pour les actions marquées `meta: { feedback: true }`
    //    (celles qui n'affichaient aucun retour), ou avec le texte `meta.successMessage`.
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (mutation.options.onError) return;
        const e = error as { response?: { data?: { message?: string; error?: string } }; message?: string };
        toast.error(e?.response?.data?.message || e?.response?.data?.error || 'L\'action a échoué. Veuillez réessayer.');
      },
      onSuccess: (_data, _vars, _ctx, mutation) => {
        const meta = mutation.meta as { feedback?: boolean; successMessage?: string } | undefined;
        if (meta?.successMessage) toast.success(meta.successMessage);
        else if (meta?.feedback) toast.success('Modification enregistrée');
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Render free tier : le backend peut mettre jusqu'à 60 s à se réveiller
        // → 3 tentatives avec délai exponentiel (1 s, 2 s, 4 s)
        retry: 3,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8_000),
      },
    },
  }));

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        {children}
        <ToastProvider />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
