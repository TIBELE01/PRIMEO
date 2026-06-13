// Availabilities service — calendar management (pro space §7.4)
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';

// Mobile-facing day status: 'available' | 'blocked' | 'booked'
type CalendarDay = { status: 'available' | 'blocked' | 'booked'; price?: number; bookingId?: string };

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Inclusive list of YYYY-MM-DD strings between two ISO dates. */
function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    dates.push(toDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// ── Parsing iCal (RFC 5545) — extrait les dates bloquées des VEVENT ───────────

/** Déplie les lignes (RFC 5545 : une ligne continue commence par espace/tab). */
function unfoldIcal(ics: string): string[] {
  const raw = ics.split(/\r?\n/);
  const lines: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

/** Valeur date YYYY-MM-DD à partir d'une ligne DTSTART/DTEND (VALUE=DATE ou datetime). */
function icalDateValue(line: string): string | null {
  const value = line.slice(line.lastIndexOf(':') + 1).trim();
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(value);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/**
 * Retourne l'ensemble des dates (YYYY-MM-DD) bloquées par les VEVENT d'un flux
 * iCal. DTEND est EXCLUSIF pour les évènements all-day (convention Airbnb/Booking).
 */
export function parseIcalBlockedDates(ics: string): Set<string> {
  const blocked = new Set<string>();
  const lines = unfoldIcal(ics);
  let start: string | null = null;
  let end: string | null = null;
  let inEvent = false;
  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) { inEvent = true; start = null; end = null; continue; }
    if (line.startsWith('END:VEVENT')) {
      if (start) {
        const last = end && end > start ? end : start; // DTEND exclusif → s'arrête la veille
        const cur = new Date(`${start}T00:00:00Z`);
        const stop = new Date(`${last}T00:00:00Z`);
        // single-day si pas de DTEND : inclut start ; sinon [start, end[
        if (!end || end <= start) {
          blocked.add(start);
        } else {
          while (cur < stop) { blocked.add(cur.toISOString().slice(0, 10)); cur.setUTCDate(cur.getUTCDate() + 1); }
        }
      }
      inEvent = false; continue;
    }
    if (!inEvent) continue;
    if (line.startsWith('DTSTART')) start = icalDateValue(line);
    else if (line.startsWith('DTEND')) end = icalDateValue(line);
  }
  return blocked;
}

async function downloadIcal(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'text/calendar' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text.includes('BEGIN:VCALENDAR')) throw new Error('Réponse non iCal');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function assertOwner(propertyId: string, ownerId: string) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new HttpError(404, 'Propriété introuvable');
  if (property.ownerId !== ownerId) throw new HttpError(403, 'Accès non autorisé');
  return property;
}

export const availabilitiesService = {
  // Calendar map for a given month — merges manual availability rows with bookings
  async getCalendar(propertyId: string, year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0)); // last day of month

    const [rows, bookings] = await Promise.all([
      prisma.availability.findMany({
        where: { propertyId, date: { gte: start, lte: end } },
        orderBy: { date: 'asc' },
      }),
      prisma.booking.findMany({
        where: {
          propertyId,
          status: { in: ['confirmed', 'completed'] },
          startDate: { lte: end },
          endDate: { gte: start },
        },
        select: { id: true, startDate: true, endDate: true },
      }),
    ]);

    const days: Record<string, CalendarDay> = {};

    // Manual availability rows (seasonal price + manual blocks)
    for (const r of rows) {
      const ds = toDateStr(r.date);
      if (r.status === 'manually_blocked' || r.status === 'external_blocked') {
        days[ds] = { status: 'blocked' };
      } else if (r.status === 'available') {
        days[ds] = { status: 'available', ...(r.priceOverride ? { price: r.priceOverride } : {}) };
      }
    }

    // Bookings take precedence — mark every covered night as booked
    for (const b of bookings) {
      for (const ds of dateRange(toDateStr(b.startDate), toDateStr(b.endDate))) {
        if (ds < toDateStr(start) || ds > toDateStr(end)) continue;
        days[ds] = { status: 'booked', bookingId: b.id };
      }
    }

    return { year, month, days };
  },

  // Apply availability / seasonal price over a date range
  async set(
    propertyId: string,
    ownerId: string,
    input: { startDate: string; endDate: string; isAvailable: boolean; price?: number },
  ) {
    await assertOwner(propertyId, ownerId);
    const dates = dateRange(input.startDate, input.endDate);
    const status = input.isAvailable ? 'available' : 'manually_blocked';

    await Promise.all(
      dates.map(date =>
        prisma.availability.upsert({
          where: { propertyId_date: { propertyId, date: new Date(date) } },
          update: { status, priceOverride: input.price ?? null },
          create: { propertyId, date: new Date(date), status, priceOverride: input.price ?? null },
        }),
      ),
    );
    return { updated: dates.length };
  },

  // Block a date range manually
  async block(
    propertyId: string,
    ownerId: string,
    input: { startDate: string; endDate: string; reason?: string },
  ) {
    await assertOwner(propertyId, ownerId);
    const dates = dateRange(input.startDate, input.endDate);

    await Promise.all(
      dates.map(date =>
        prisma.availability.upsert({
          where: { propertyId_date: { propertyId, date: new Date(date) } },
          update: { status: 'manually_blocked' },
          create: { propertyId, date: new Date(date), status: 'manually_blocked' },
        }),
      ),
    );
    return { blocked: dates.length };
  },

  // ── Import iCal externe (Airbnb / Booking) ──────────────────────────────────

  async listIcalFeeds(propertyId: string, ownerId: string) {
    await assertOwner(propertyId, ownerId);
    return prisma.propertyIcalFeed.findMany({ where: { propertyId }, orderBy: { createdAt: 'asc' } });
  },

  async addIcalFeed(propertyId: string, ownerId: string, input: { url: string; source?: string }) {
    await assertOwner(propertyId, ownerId);
    let parsed: URL;
    try { parsed = new URL(input.url); } catch { throw new HttpError(400, 'URL iCal invalide.'); }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new HttpError(400, 'L\'URL iCal doit être en http(s).');
    }
    const source = ['airbnb', 'booking', 'autre'].includes(input.source ?? '') ? input.source! : 'autre';
    const feed = await prisma.propertyIcalFeed.create({ data: { propertyId, url: input.url, source } });
    // Synchronisation initiale (non bloquante pour la réponse)
    await availabilitiesService.syncProperty(propertyId).catch(() => undefined);
    return prisma.propertyIcalFeed.findUnique({ where: { id: feed.id } });
  },

  async removeIcalFeed(propertyId: string, feedId: string, ownerId: string) {
    await assertOwner(propertyId, ownerId);
    const feed = await prisma.propertyIcalFeed.findFirst({ where: { id: feedId, propertyId } });
    if (!feed) throw new HttpError(404, 'Flux iCal introuvable');
    await prisma.propertyIcalFeed.delete({ where: { id: feedId } });
    // Recalcule les blocages externes à partir des flux restants
    await availabilitiesService.syncProperty(propertyId).catch(() => undefined);
    return { removed: true };
  },

  /**
   * Synchronise un bien : agrège les dates bloquées de TOUS ses flux iCal et
   * réconcilie les lignes `external_blocked` — sans jamais toucher aux
   * réservations internes (`booked`) ni aux blocages manuels (`manually_blocked`).
   */
  async syncProperty(propertyId: string): Promise<{ blocked: number; added: number; removed: number; errors: number }> {
    const feeds = await prisma.propertyIcalFeed.findMany({ where: { propertyId } });
    const blocked = new Set<string>();
    let errors = 0;

    for (const feed of feeds) {
      try {
        const ics = await downloadIcal(feed.url);
        for (const d of parseIcalBlockedDates(ics)) blocked.add(d);
        await prisma.propertyIcalFeed.update({ where: { id: feed.id }, data: { lastSyncedAt: new Date(), lastError: null } });
      } catch (e) {
        errors += 1;
        await prisma.propertyIcalFeed.update({
          where: { id: feed.id },
          data: { lastSyncedAt: new Date(), lastError: (e as Error).message.slice(0, 250) },
        }).catch(() => undefined);
      }
    }

    const existing = await prisma.availability.findMany({ where: { propertyId }, select: { id: true, date: true, status: true } });
    const existingByDate = new Map(existing.map((r) => [toDateStr(r.date), r]));

    // À créer : dates bloquées sans ligne existante
    const toCreate = [...blocked].filter((d) => !existingByDate.has(d));
    // À convertir : lignes `available` qui deviennent bloquées (jamais booked/manual)
    const toUpdate = existing.filter((r) => r.status === 'available' && blocked.has(toDateStr(r.date))).map((r) => r.id);
    // À retirer : anciens `external_blocked` qui ne sont plus dans les flux
    const toDelete = existing.filter((r) => r.status === 'external_blocked' && !blocked.has(toDateStr(r.date))).map((r) => r.id);

    if (toCreate.length > 0) {
      await prisma.availability.createMany({
        data: toCreate.map((d) => ({ propertyId, date: new Date(d), status: 'external_blocked' as const })),
        skipDuplicates: true,
      });
    }
    if (toUpdate.length > 0) {
      await prisma.availability.updateMany({ where: { id: { in: toUpdate } }, data: { status: 'external_blocked' } });
    }
    if (toDelete.length > 0) {
      await prisma.availability.deleteMany({ where: { id: { in: toDelete } } });
    }

    return { blocked: blocked.size, added: toCreate.length + toUpdate.length, removed: toDelete.length, errors };
  },

  /** Cron : resynchronise tous les biens ayant au moins un flux iCal. */
  async syncAllFeeds(): Promise<{ properties: number }> {
    const grouped = await prisma.propertyIcalFeed.findMany({ select: { propertyId: true }, distinct: ['propertyId'] });
    for (const { propertyId } of grouped) {
      await availabilitiesService.syncProperty(propertyId).catch(() => undefined);
    }
    return { properties: grouped.length };
  },

  // iCal (RFC 5545) feed — bookings + manual blocks as VEVENTs for external sync
  async exportIcal(propertyId: string): Promise<string> {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new HttpError(404, 'Propriété introuvable');

    const [bookings, blocked] = await Promise.all([
      prisma.booking.findMany({
        where: { propertyId, status: { in: ['confirmed', 'completed'] } },
        select: { id: true, startDate: true, endDate: true },
      }),
      prisma.availability.findMany({
        where: { propertyId, status: 'manually_blocked' },
        select: { id: true, date: true },
        orderBy: { date: 'asc' },
      }),
    ]);

    const stamp = (d: Date) => `${toDateStr(d).replace(/-/g, '')}`;
    const now = new Date();
    const dtstamp = `${stamp(now)}T000000Z`;
    const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Primeo//Calendrier de disponibilité//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${esc(property.title ?? 'Primeo')}`,
    ];

    // Bookings — DTEND is exclusive in iCal all-day events, so add one day
    for (const b of bookings) {
      const endExclusive = new Date(b.endDate);
      endExclusive.setDate(endExclusive.getDate() + 1);
      lines.push(
        'BEGIN:VEVENT',
        `UID:booking-${b.id}@primeo.ci`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${stamp(b.startDate)}`,
        `DTEND;VALUE=DATE:${stamp(endExclusive)}`,
        'SUMMARY:Réservé (Primeo)',
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'END:VEVENT',
      );
    }

    // Manually blocked days — one all-day VEVENT each
    for (const blk of blocked) {
      const endExclusive = new Date(blk.date);
      endExclusive.setDate(endExclusive.getDate() + 1);
      lines.push(
        'BEGIN:VEVENT',
        `UID:block-${blk.id}@primeo.ci`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${stamp(blk.date)}`,
        `DTEND;VALUE=DATE:${stamp(endExclusive)}`,
        'SUMMARY:Bloqué (Primeo)',
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'END:VEVENT',
      );
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  },
};
