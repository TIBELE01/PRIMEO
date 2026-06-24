// Global admin state (Zustand) — aggregates dashboard-level state
import { create } from 'zustand';

interface DashboardStats {
  totalUsers: number;
  totalProperties: number;
  totalBookings: number;
  totalRevenue: number;
  pendingKyc: number;
  pendingProperties: number;
  pendingModeration: number;
  openDisputes: number;
  openTickets: number;
}

interface AdminGlobalState {
  stats: DashboardStats | null;
  isStatsLoading: boolean;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;       // tiroir de navigation (mobile/tablette)
  globalSearch: string;
  setStats: (stats: DashboardStats) => void;
  setStatsLoading: (loading: boolean) => void;
  toggleSidebar: () => void;
  setMobileNav: (open: boolean) => void;
  setGlobalSearch: (query: string) => void;
}

export const useAdminStore = create<AdminGlobalState>(set => ({
  stats: null,
  isStatsLoading: false,
  sidebarCollapsed: false,
  mobileNavOpen: false,
  globalSearch: '',
  setStats: (stats) => set({ stats }),
  setStatsLoading: (isStatsLoading) => set({ isStatsLoading }),
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setMobileNav: (mobileNavOpen) => set({ mobileNavOpen }),
  setGlobalSearch: (globalSearch) => set({ globalSearch }),
}));
