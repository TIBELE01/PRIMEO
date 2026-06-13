// Tests import iCal externe : parsing VEVENT + réconciliation (protège les
// réservations internes et blocages manuels).
jest.mock('../../common/handlers/http-error.handler', () => ({
  HttpError: class HttpError extends Error { statusCode: number; constructor(s: number, m: string) { super(m); this.statusCode = s; } },
}));

const mockPrisma: Record<string, any> = {
  property: { findUnique: jest.fn() },
  propertyIcalFeed: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(async () => ({})) },
  availability: { findMany: jest.fn(async () => []), createMany: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({})), deleteMany: jest.fn(async () => ({})) },
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { availabilitiesService, parseIcalBlockedDates } from './availabilities.service';

const ICS = [
  'BEGIN:VCALENDAR', 'VERSION:2.0',
  'BEGIN:VEVENT', 'DTSTART;VALUE=DATE:20260201', 'DTEND;VALUE=DATE:20260204', 'SUMMARY:Reserved', 'END:VEVENT', // 1,2,3 fév (DTEND exclusif)
  'BEGIN:VEVENT', 'DTSTART;VALUE=DATE:20260210', 'SUMMARY:Closed', 'END:VEVENT', // un seul jour : 10 fév
  'END:VCALENDAR',
].join('\r\n');

describe('parseIcalBlockedDates', () => {
  it('extrait les dates (DTEND exclusif, single-day sans DTEND)', () => {
    const set = parseIcalBlockedDates(ICS);
    expect([...set].sort()).toEqual(['2026-02-01', '2026-02-02', '2026-02-03', '2026-02-10']);
  });
  it('gère le dépliage des lignes et l\'absence de VEVENT', () => {
    expect(parseIcalBlockedDates('BEGIN:VCALENDAR\r\nEND:VCALENDAR').size).toBe(0);
  });
});

describe('syncProperty — réconciliation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.propertyIcalFeed.findMany.mockResolvedValue([{ id: 'f1', url: 'https://airbnb/cal.ics' }]);
    global.fetch = jest.fn(async () => ({ ok: true, text: async () => ICS })) as any;
  });

  it('ajoute les dates externes, convertit les `available`, et NE touche PAS booked/manual', async () => {
    // 02-01 inexistante → create ; 02-02 available → update ; 02-03 booked → ignorée ;
    // 02-10 manually_blocked → ignorée ; une ancienne external_blocked (02-20) hors flux → delete
    mockPrisma.availability.findMany.mockResolvedValue([
      { id: 'a2', date: new Date('2026-02-02'), status: 'available' },
      { id: 'a3', date: new Date('2026-02-03'), status: 'booked' },
      { id: 'a10', date: new Date('2026-02-10'), status: 'manually_blocked' },
      { id: 'aold', date: new Date('2026-02-20'), status: 'external_blocked' },
    ]);

    const res = await availabilitiesService.syncProperty('prop-1');

    // create : 02-01 (02-02 existe déjà ; 02-03/02-10 sont déjà des lignes → pas create)
    const created = mockPrisma.availability.createMany.mock.calls[0][0].data.map((d: any) => d.date.toISOString().slice(0, 10));
    expect(created).toEqual(['2026-02-01']);
    // update → seulement la ligne available (a2)
    expect(mockPrisma.availability.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ['a2'] } }, data: { status: 'external_blocked' } }));
    // delete → ancienne external_blocked hors flux (aold) ; jamais booked/manual
    expect(mockPrisma.availability.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ['aold'] } } }));
    expect(res).toMatchObject({ errors: 0 });
  });

  it('enregistre l\'erreur du flux sans planter (HTTP KO)', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 404, text: async () => '' })) as any;
    const res = await availabilitiesService.syncProperty('prop-1');
    expect(res.errors).toBe(1);
    expect(mockPrisma.propertyIcalFeed.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ lastError: expect.any(String) }),
    }));
  });
});

describe('addIcalFeed — validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.property.findUnique.mockResolvedValue({ id: 'prop-1', ownerId: 'pro-1' });
  });
  it('refuse une URL non http(s)', async () => {
    await expect(availabilitiesService.addIcalFeed('prop-1', 'pro-1', { url: 'ftp://x/cal.ics' })).rejects.toMatchObject({ statusCode: 400 });
  });
  it('refuse un non-propriétaire', async () => {
    await expect(availabilitiesService.addIcalFeed('prop-1', 'intrus', { url: 'https://x/cal.ics' })).rejects.toMatchObject({ statusCode: 403 });
  });
});
