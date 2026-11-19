// Common utility functions for admin dashboard
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Les formateurs tolèrent une valeur absente ou invalide (« — ») : une donnée manquante
// ne doit jamais faire planter toute la page.
function toValidDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(iso?: string | null): string {
  const d = toValidDate(iso);
  return d ? format(d, 'dd/MM/yyyy', { locale: fr }) : '—';
}

export function formatDateTime(iso?: string | null): string {
  const d = toValidDate(iso);
  return d ? format(d, 'dd/MM/yyyy HH:mm', { locale: fr }) : '—';
}

export function formatRelative(iso?: string | null): string {
  const d = toValidDate(iso);
  return d ? formatDistanceToNow(d, { addSuffix: true, locale: fr }) : '—';
}

export function formatAmount(amount?: number | null, currency = 'XOF'): string {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '—';
  return `${Number(amount).toLocaleString('fr-FR')} ${currency}`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function truncate(text: string, max = 50): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join('');
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim();
}

export function exportChartAsPng(container: HTMLElement | null, filename: string): void {
  if (!container) return;
  const svg = container.querySelector('svg');
  if (!svg) return;
  const { width, height } = svg.getBoundingClientRect();
  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement('canvas');
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const img = new Image();
  img.onload = () => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(2, 2);
    ctx.drawImage(img, 0, 0);
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}

export function downloadCsv(rows: object[], filename: string): void {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify((r as any)[h] ?? '')).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
