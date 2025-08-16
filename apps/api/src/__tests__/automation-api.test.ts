import { build } from '../app';
import { FastifyInstance } from 'fastify';

describe('Automation API', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await build({ logger: false });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/automation/analyze', () => {
    it('should analyze door unlock event', async () => {
      const event = {
        eventType: 'deviceStateChange',
        deviceType: 'Lock',
        deviceId: 'lock-001',
        state: 'unlocked',
        timestamp: new Date().toISOString(),
        context: {
          time: '18:30',
          location: 'entrance'
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/automation/analyze',
        payload: event
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.data.suggestions).toBeDefined();
      expect(result.data.confidence).toBeGreaterThan(0);
    });

    it('should analyze temperature sensor event', async () => {
      const event = {
        eventType: 'sensorData',
        deviceType: 'Meter',
        deviceId: 'meter-001',
        state: { temperature: 30, humidity: 70 },
        timestamp: new Date().toISOString(),
        context: {
          time: '14:00',
          location: 'living_room'
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/automation/analyze',
        payload: event
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.data.suggestions).toBeDefined();
    });
  });

  describe('POST /api/automation/propose', () => {
    it('should generate proposal for evening entry', async () => {
      const context = {
        time: '19:30',
        location: 'entrance',
        recentEvents: ['door_unlock'],
        availableDevices: ['light_entrance', 'light_living']
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/automation/propose',
        payload: context
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.data.type).toBe('lighting');
      expect(result.data.description).toContain('照明');
    });
  });

  describe('POST /api/scenes/record', () => {
    it('should record operation', async () => {
      const operation = {
        deviceId: 'light_entrance',
        command: 'turnOn',
        parameters: {},
        timestamp: new Date().toISOString(),
        userId: 'user-001'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/scenes/record',
        payload: operation
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.message).toContain('記録');
    });
  });

  describe('GET /api/scenes/patterns', () => {
    it('should return operation patterns', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/scenes/patterns'
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('GET /api/scenes/candidates', () => {
    it('should return scene candidates', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/scenes/candidates'
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('POST /api/scenes/suggestions', () => {
    it('should return scene suggestions', async () => {
      const context = {
        time: '18:30',
        location: 'entrance',
        recentEvents: ['door_unlock'],
        availableDevices: ['light_entrance', 'light_living']
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/scenes/suggestions',
        payload: context
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });
});
