// Tests unitaires — commande de plat (sans paiement) : création + ouverture
// automatique d'une conversation client ↔ restaurant.
const mockPrisma = {
  property: { findUnique: jest.fn() },
  restaurantMenuItem: { findMany: jest.fn() },
  foodOrder: { create: jest.fn() },
  notification: { create: jest.fn().mockResolvedValue({}) },
  message: { create: jest.fn().mockResolvedValue({}) },
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));
jest.mock('../messaging/socket.server', () => ({ getSocketServer: () => null }));
jest.mock('../../common/utils/push', () => ({ sendPushNotification: jest.fn().mockResolvedValue({}) }));
jest.mock('../../common/utils/mailer', () => ({ sendEmail: jest.fn().mockResolvedValue({}) }));
jest.mock('../../common/utils/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() } }));

import { foodOrdersService } from './food-orders.service';

const OWNER = 'owner-1';
const CLIENT = 'client-1';
const PID = 'resto-1';

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.property.findUnique.mockResolvedValue({
    id: PID, ownerId: OWNER, propertyType: 'restaurant', status: 'active', title: 'Le Resto',
    owner: { id: OWNER, onesignalPlayerId: null, firstName: 'Paul', email: 'paul@resto.ci' },
  });
  mockPrisma.restaurantMenuItem.findMany.mockResolvedValue([
    { id: 'm1', propertyId: PID, status: 'approved', isAvailable: true, name: 'Attiéké poisson', price: 3000 },
  ]);
  mockPrisma.foodOrder.create.mockResolvedValue({
    id: 'order-abc12345',
    items: [{ quantity: 2, menuItem: { name: 'Attiéké poisson' } }],
    client: { firstName: 'Awa', lastName: 'Koné', phone: '0700000000', email: 'awa@x.ci' },
    property: { title: 'Le Resto' },
  });
});

describe('foodOrdersService — createOrder (sans paiement)', () => {
  it('crée la commande avec le bon total et ouvre une conversation client ↔ restaurant', async () => {
    await foodOrdersService.createOrder(CLIENT, {
      propertyId: PID,
      items: [{ menuItemId: 'm1', quantity: 2 }],
      deliveryType: 'dine_in',
    });

    expect(mockPrisma.foodOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ totalAmount: 6000, clientId: CLIENT }) }),
    );
    // Conversation automatique : 1er message du client vers le restaurateur
    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ senderId: CLIENT, receiverId: OWNER }) }),
    );
  });

  it('refuse une commande vide (400)', async () => {
    await expect(
      foodOrdersService.createOrder(CLIENT, { propertyId: PID, items: [], deliveryType: 'dine_in' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('refuse une livraison sans adresse (400)', async () => {
    await expect(
      foodOrdersService.createOrder(CLIENT, {
        propertyId: PID, items: [{ menuItemId: 'm1', quantity: 1 }], deliveryType: 'delivery',
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('refuse un plat non validé / introuvable (400)', async () => {
    mockPrisma.restaurantMenuItem.findMany.mockResolvedValue([]); // aucun plat approved
    await expect(
      foodOrdersService.createOrder(CLIENT, {
        propertyId: PID, items: [{ menuItemId: 'm1', quantity: 1 }], deliveryType: 'dine_in',
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mockPrisma.message.create).not.toHaveBeenCalled();
  });
});
