'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { ToastProvider } from '@/components/ui/Toast';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
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
