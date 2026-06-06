// UI state — loading overlays, toast messages, theme (Zustand)
import { create } from 'zustand';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface UIState {
  isGlobalLoading: boolean;
  toasts: Toast[];
  showLoading: () => void;
  hideLoading: () => void;
  showToast: (type: Toast['type'], message: string) => void;
  dismissToast: (id: string) => void;
}

export const useUIStore = create<UIState>(set => ({
  isGlobalLoading: false,
  toasts: [],
  showLoading: () => set({ isGlobalLoading: true }),
  hideLoading: () => set({ isGlobalLoading: false }),
  showToast: (type, message) =>
    set(state => ({
      toasts: [...state.toasts, { id: Date.now().toString(), type, message }],
    })),
  dismissToast: id =>
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
}));
