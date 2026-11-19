'use client';
import { Badge } from '@/components/ui/Badge';
import { StatusMeta } from '@/lib/status';

/** Badge de statut coloré à partir d'une table de correspondance (lib/status.ts). */
export function StatusBadge({ value, map }: { value?: string | null; map: Record<string, StatusMeta> }) {
  if (!value) return <span className="text-xs text-gray-400">—</span>;
  const meta = map[value];
  return <Badge variant={meta?.tone ?? 'default'}>{meta?.label ?? value}</Badge>;
}
