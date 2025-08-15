import { verifyWebhookSignature, createWebhookResponse } from '../webhook';

describe('SwitchBot Webhook Verification', () => {
  const mockSecret = 'test-webhook-secret';
  const mockVerifyToken = 'test-verify-token';

  describe('verifyWebhookSignature', () => {
    it('should verify valid webhook signature', () => {
      // SwitchBot Webhook仕様に基づくテストケース
      const payload = JSON.stringify({
        eventType: 'changeReport',
        eventVersion: '1',
        context: {
          deviceType: 'WoIOSensor',
          deviceMac: 'xx:xx:xx:xx:xx:xx',
          temperature: 25.5,
          humidity: 60
        }
      });
      
      const currentTime = Date.now();
      const timestamp = currentTime.toString();
      const nonce = 'webhook-nonce-123';
      
      // 正しい署名を生成（テスト用）
      const expectedSignature = generateTestSignature(payload, timestamp, nonce, mockSecret);
      
      const isValid = verifyWebhookSignature(payload, expectedSignature, timestamp, nonce, mockSecret);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid webhook signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const currentTime = Date.now();
      const timestamp = currentTime.toString();
      const nonce = 'webhook-nonce-123';
      const invalidSignature = 'invalid-signature';
      
      const isValid = verifyWebhookSignature(payload, invalidSignature, timestamp, nonce, mockSecret);
      
      expect(isValid).toBe(false);
    });

    it('should reject expired webhook (timestamp too old)', () => {
      const payload = JSON.stringify({ test: 'data' });
      const oldTimestamp = (Date.now() - 600000).toString(); // 10分前
      const nonce = 'webhook-nonce-123';
      const signature = generateTestSignature(payload, oldTimestamp, nonce, mockSecret);
      
      const isValid = verifyWebhookSignature(payload, signature, oldTimestamp, nonce, mockSecret);
      
      expect(isValid).toBe(false);
    });

    it('should validate required parameters', () => {
      expect(() => {
        verifyWebhookSignature('', 'sig', '123', 'nonce', mockSecret);
      }).toThrow('Payload is required');

      expect(() => {
        verifyWebhookSignature('payload', '', '123', 'nonce', mockSecret);
      }).toThrow('Signature is required');

      expect(() => {
        verifyWebhookSignature('payload', 'sig', '', 'nonce', mockSecret);
      }).toThrow('Timestamp is required');
    });
  });

  describe('createWebhookResponse', () => {
    it('should create success response', () => {
      const response = createWebhookResponse(200, 'Success');
      
      expect(response).toEqual({
        statusCode: 200,
        message: 'Success',
        timestamp: expect.any(String)
      });
    });

    it('should create error response', () => {
      const response = createWebhookResponse(400, 'Invalid signature');
      
      expect(response).toEqual({
        statusCode: 400,
        message: 'Invalid signature',
        timestamp: expect.any(String)
      });
    });
  });
});

// テスト用のヘルパー関数
function generateTestSignature(payload: string, timestamp: string, nonce: string, secret: string): string {
  // SwitchBot Webhook署名の実装に合わせる
  const crypto = require('crypto');
  const stringToSign = secret + nonce + timestamp + payload;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(stringToSign, 'utf8');
  return hmac.digest('base64');
}
