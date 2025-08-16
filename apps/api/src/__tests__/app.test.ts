import { build } from '../app';

// Fetchをモック化
global.fetch = jest.fn();

describe('API Server', () => {
  let app: any;

  beforeEach(async () => {
    // CI環境での環境変数を設定
    process.env.SWITCHBOT_TOKEN = 'test-token';
    process.env.SWITCHBOT_SECRET = 'test-secret';
    process.env.SWITCHBOT_WEBHOOK_SECRET = 'test-webhook-secret';
    process.env.SWITCHBOT_WEBHOOK_VERIFY_TOKEN = 'test-verify-token';
    // LLMを無効化（テスト環境では不要）
    process.env.LLM_PROVIDER = '';
    process.env.OPENAI_API_KEY = '';
    
    // SwitchBot APIのモック
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        statusCode: 100,
        body: {
          deviceList: [],
          infraredRemoteList: []
        },
        message: 'success'
      })
    });
    
    app = await build({ logger: false });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    
    // 環境変数をクリーンアップ
    delete process.env.SWITCHBOT_TOKEN;
    delete process.env.SWITCHBOT_SECRET;
    delete process.env.SWITCHBOT_WEBHOOK_SECRET;
    delete process.env.SWITCHBOT_WEBHOOK_VERIFY_TOKEN;
    delete process.env.LLM_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    
    // モックをクリア
    jest.clearAllMocks();
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

      // 実際の認証情報があるため200が正常
      expect(response.statusCode).toBe(200);
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

      // 実際の認証情報があるため200が正常（無効なデバイスIDでもAPIは呼び出される）
      expect(response.statusCode).toBe(200);
    });
  });
});
