// E2E tests for booking endpoints
import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('Bookings E2E', () => {
  describe('GET /api/bookings/me', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/bookings/me');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/bookings', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/bookings')
        .send({ propertyId: 'test', checkIn: '2025-01-01', checkOut: '2025-01-05', guestCount: 2, paymentOption: 'full_online' });
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/bookings/:id/payment-status', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/bookings/abc123/payment-status');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/bookings/:id/invoice', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/bookings/abc123/invoice');
      expect(response.status).toBe(401);
    });
  });
});
