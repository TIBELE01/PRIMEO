// E2E tests for authentication endpoints
import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('Auth E2E', () => {
  describe('POST /api/auth/register', () => {
    it('should return 201 with valid payload', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          phone: '+2250700000099',
          password: 'Password123!',
          role: 'client',
        });
      expect([201, 409]).toContain(response.status);
    });

    it('should return 400 with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: 'pass', role: 'client', firstName: 'A', lastName: 'B', phone: '+2250700000099' });
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/health', () => {
    it('should return 200 with status ok', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });
});
