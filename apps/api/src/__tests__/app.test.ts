import { build } from '../app';

describe('API Server', () => {
  let app: any;

  beforeEach(async () => {
    app = build({ logger: false });
    await app.ready(); // プラグインの登録を待つ
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Health Check', () => {
    it('should respond to health check', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual({
        status: 'ok',
        timestamp: expect.any(String)
      });
    });
  });

  describe('SwitchBot API Routes', () => {
    it('should have switchbot devices endpoint', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/switchbot/devices'
      });

      // 認証情報がないため500エラーになるのが正常
      expect(response.statusCode).toBe(500);
    });

    it('should have switchbot command endpoint', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/switchbot/command',
        payload: {
          deviceId: 'test-device',
          command: 'turnOn'
        }
      });

      // 認証情報がないため500エラーになるのが正常
      expect(response.statusCode).toBe(500);
    });
  });
});
