// E2E tests for property endpoints
import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('Properties E2E', () => {
  describe('GET /api/properties', () => {
    it('should return 200 with list', async () => {
      const response = await request(app).get('/api/properties');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/properties', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/properties')
        .send({ name: 'Test Property' });
      expect(response.status).toBe(401);
    });
  });
});
