// Adaptateurs entre les réponses de l'API admin (objets Prisma imbriqués) et les types
// plats utilisés par les écrans du back-office. Aucune logique métier : simple mise en forme.
import type { AdminBooking } from '../types/booking';

type Rec = Record<string, any>;
const fullName = (u?: Rec | null): string => (u ? [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email || '' : '');

export function normalizeBooking(b: Rec): AdminBooking & Rec {
  const start = b.checkIn ?? b.startDate;
  const end = b.checkOut ?? b.endDate;
  const nights = start && end ? Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000)) : 0;
  const owner = b.property?.owner;
  const online = Number(b.onlinePaidAmount ?? 0);
  const total = Number(b.totalAmount ?? 0);
  const txPaid = Array.isArray(b.transactions) && b.transactions.some((t: Rec) => t.status === 'success');
  return {
    ...b,
    propertyTitle: b.propertyTitle ?? b.property?.title ?? '—',
    propertyCity: b.property?.city,
    clientName: b.clientName ?? fullName(b.client) ?? '—',
    clientEmail: b.client?.email,
    clientPhone: b.client?.phone,
    professionalId: b.professionalId ?? owner?.id ?? b.property?.ownerId,
    professionalName: b.professionalName ?? fullName(owner),
    checkIn: start,
    checkOut: end,
    nights: b.nights ?? nights,
    guestCount: b.guestCount ?? b.guests,
    netAmount: b.netAmount ?? total - Number(b.commissionAmount ?? 0),
    paymentStatus: b.paymentStatus ?? (txPaid || online >= total && total > 0 ? 'paid' : online > 0 ? 'partial' : 'pending'),
  } as unknown as AdminBooking & Rec;
}

/** Extrait le tableau d'éléments d'une réponse paginée ({ data, total, pages, limit }) ou d'un tableau brut. */
export function listOf(res: any): any[] {
  if (Array.isArray(res)) return res;
  return res?.data ?? res?.items ?? res?.bookings ?? res?.users ?? [];
}

export function pagesOf(res: any): number {
  if (!res || Array.isArray(res)) return 1;
  if (res.pages) return Number(res.pages);
  const size = Number(res.limit ?? res.pageSize ?? 20);
  return res.total ? Math.max(1, Math.ceil(Number(res.total) / size)) : 1;
}

const levelOf = (action: string): 'info' | 'warning' | 'danger' =>
  /ban|delete|error/.test(action) ? 'danger' : /suspend|reject|hide/.test(action) ? 'warning' : 'info';

/** Entrée du journal d'audit : ajoute le nom de l'administrateur, l'IP et le niveau attendus par l'écran de détail. */
export function normalizeAuditLog(l: Rec): Rec {
  return {
    ...l,
    adminName: l.adminName ?? (fullName(l.user) || 'Système'),
    ip: l.ip ?? l.ipAddress ?? null,
    level: l.level ?? levelOf(String(l.action ?? '')),
  };
}
