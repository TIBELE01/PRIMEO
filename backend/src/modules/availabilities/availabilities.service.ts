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
      if (r.status === 'manually_blocked') {
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
