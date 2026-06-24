'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useAdminStore } from '@/store/adminStore';
import { analyticsService } from '@/services/api';
import { isSessionExpired, updateLastActivity } from '@/lib/cookies';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout } = useAuthStore();
  const { setStats } = useAdminStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (isSessionExpired()) {
      logout();
      router.push('/login');
      return;
    }
    updateLastActivity();
    analyticsService.getDashboardStats().then((s: any) =>
      setStats({ ...s, pendingModeration: (s?.pendingKyc ?? 0) + (s?.pendingProperties ?? 0) }),
    ).catch(() => {});
    const handleActivity = () => updateLastActivity();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    const interval = setInterval(() => {
      if (isSessionExpired()) {
        logout();
        router.push('/login');
      }
    }, 60_000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, [isAuthenticated, logout, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  );
}
