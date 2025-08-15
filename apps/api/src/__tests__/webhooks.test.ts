import { build } from '../app';
import { FastifyInstance } from 'fastify';
import * as crypto from 'crypto';

describe('SwitchBot Webhooks', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = build({ logger: false });
    await app.ready();
    
    // Webhook秘密鍵をテスト用に設定
    process.env.SWITCHBOT_WEBHOOK_SECRET = 'test-webhook-secret';
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    delete process.env.SWITCHBOT_WEBHOOK_SECRET;
  });

  // Helper function to generate webhook signature for testing
  const generateTestSignature = (payload: string, timestamp: string, nonce: string, secret: string): string => {
    const stringToSign = secret + nonce + timestamp + payload;
    return crypto.createHmac('sha256', secret).update(stringToSign).digest('base64');
  };

  describe('POST /api/webhooks/switchbot', () => {
    const mockWebhookEvent = {
      eventType: 'changeReport',
      eventVersion: '1',
      context: {
        deviceType: 'WoIOSensor',
        deviceMac: 'xx:xx:xx:xx:xx:xx',
        temperature: 25.5,
        humidity: 60,
        timeOfSample: Date.now()
      }
    };

    it('should accept valid webhook with signature', async () => {
      const payload = JSON.stringify(mockWebhookEvent);
      const timestamp = Date.now().toString();
      const nonce = 'test-nonce-123';
      const signature = generateTestSignature(payload, timestamp, nonce, 'test-webhook-secret');

      const response = await app.inject({
        method: 'POST',
        url: '/api/webhooks/switchbot',
        headers: {
          'content-type': 'application/json',
          'x-signature': signature,
          't': timestamp,
          'nonce': nonce
        },
        payload: mockWebhookEvent
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.statusCode).toBe(100);
      expect(data.message).toBe('Webhook processed successfully');
    });

    it('should reject webhook with invalid signature', async () => {
      const payload = JSON.stringify(mockWebhookEvent);
      const timestamp = Date.now().toString();
      const nonce = 'test-nonce-123';

      const response = await app.inject({
        method: 'POST',
        url: '/api/webhooks/switchbot',
        headers: {
          'content-type': 'application/json',
          'x-signature': 'invalid-signature',
          't': timestamp,
          'nonce': nonce
        },
        payload: mockWebhookEvent
      });

      expect(response.statusCode).toBe(401);
      const data = response.json();
      expect(data.statusCode).toBe(401);
      expect(data.message).toBe('Invalid signature');
    });

    it('should accept webhook without signature (development mode)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/webhooks/switchbot',
        headers: {
          'content-type': 'application/json'
        },
        payload: mockWebhookEvent
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.statusCode).toBe(100);
      expect(data.message).toBe('Webhook processed successfully');
    });

    it('should reject webhook with expired timestamp', async () => {
      const payload = JSON.stringify(mockWebhookEvent);
      const expiredTimestamp = (Date.now() - 600000).toString(); // 10 minutes ago
      const nonce = 'test-nonce-123';
      const signature = generateTestSignature(payload, expiredTimestamp, nonce, 'test-webhook-secret');

      const response = await app.inject({
        method: 'POST',
        url: '/api/webhooks/switchbot',
        headers: {
          'content-type': 'application/json',
          'x-signature': signature,
          't': expiredTimestamp,
          'nonce': nonce
        },
        payload: mockWebhookEvent
      });

      expect(response.statusCode).toBe(401);
      const data = response.json();
      expect(data.statusCode).toBe(401);
      expect(data.message).toBe('Invalid signature');
    });

    it('should handle malformed JSON payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/webhooks/switchbot',
        headers: {
          'content-type': 'application/json'
        },
        payload: 'invalid json'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return error when webhook secret is not configured', async () => {
      delete process.env.SWITCHBOT_WEBHOOK_SECRET;

      const response = await app.inject({
        method: 'POST',
        url: '/api/webhooks/switchbot',
        headers: {
          'content-type': 'application/json',
          'x-signature': 'some-signature',
          't': Date.now().toString(),
          'nonce': 'some-nonce'
        },
        payload: mockWebhookEvent
      });

      expect(response.statusCode).toBe(500);
      const data = response.json();
      expect(data.statusCode).toBe(500);
      expect(data.message).toBe('Server configuration error');
    });
  });

  describe('GET /api/webhooks/switchbot/status', () => {
    it('should return webhook configuration status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/webhooks/switchbot/status'
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.status).toBe('ready');
      expect(data.webhookSecret).toBe('configured');
      expect(data.timestamp).toBeDefined();
    });

    it('should show missing webhook secret', async () => {
      delete process.env.SWITCHBOT_WEBHOOK_SECRET;

      const response = await app.inject({
        method: 'GET',
        url: '/api/webhooks/switchbot/status'
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.status).toBe('ready');
      expect(data.webhookSecret).toBe('missing');
    });
  });

  describe('Webhook Event Processing', () => {
    it('should handle sensor data events', async () => {
      const sensorEvent = {
        eventType: 'changeReport',
        eventVersion: '1',
        context: {
          deviceType: 'WoIOSensor',
          deviceMac: 'aa:bb:cc:dd:ee:ff',
          temperature: 22.3,
          humidity: 55,
          lightLevel: 300,
          battery: 85,
          timeOfSample: Date.now()
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/webhooks/switchbot',
        headers: {
          'content-type': 'application/json'
        },
        payload: sensorEvent
      });

      expect(response.statusCode).toBe(200);
    });

    it('should handle device state change events', async () => {
      const deviceEvent = {
        eventType: 'changeReport',
        eventVersion: '1',
        context: {
          deviceType: 'WoHand',
          deviceMac: 'ff:ee:dd:cc:bb:aa',
          battery: 90,
          timeOfSample: Date.now()
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/webhooks/switchbot',
        headers: {
          'content-type': 'application/json'
        },
        payload: deviceEvent
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
