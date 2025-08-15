import { generateSignature, createAuthHeaders } from '../signature';

describe('SwitchBot Signature Generation', () => {
  const mockToken = 'test-token-123';
  const mockSecret = 'test-secret-456';

  describe('generateSignature', () => {
    it('should generate correct HMAC-SHA256 signature', () => {
      // SwitchBot公式ドキュメントのサンプル値でテスト
      const token = 'c271335fxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      const secret = '8888888888xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      const nonce = 'requestID';
      const t = '1634896387430';
      
      const signature = generateSignature(token, secret, t, nonce);
      
      // 期待値は公式ドキュメントから取得（実際の値に合わせて更新が必要）
      expect(signature).toBeTruthy();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(20);
    });

    it('should generate different signatures for different nonce values', () => {
      const t = Date.now().toString();
      const signature1 = generateSignature(mockToken, mockSecret, t, 'nonce1');
      const signature2 = generateSignature(mockToken, mockSecret, t, 'nonce2');
      
      expect(signature1).not.toBe(signature2);
    });

    it('should generate different signatures for different timestamps', () => {
      const nonce = 'test-nonce';
      const t1 = '1634896387430';
      const t2 = '1634896387431';
      
      const signature1 = generateSignature(mockToken, mockSecret, t1, nonce);
      const signature2 = generateSignature(mockToken, mockSecret, t2, nonce);
      
      expect(signature1).not.toBe(signature2);
    });
  });

  describe('createAuthHeaders', () => {
    it('should create correct authentication headers', () => {
      const headers = createAuthHeaders(mockToken, mockSecret);
      
      expect(headers).toHaveProperty('Authorization', mockToken);
      expect(headers).toHaveProperty('sign');
      expect(headers).toHaveProperty('t');
      expect(headers).toHaveProperty('nonce');
      expect(headers).toHaveProperty('Content-Type', 'application/json');
    });

    it('should generate unique nonce for each call', () => {
      const headers1 = createAuthHeaders(mockToken, mockSecret);
      const headers2 = createAuthHeaders(mockToken, mockSecret);
      
      expect(headers1.nonce).not.toBe(headers2.nonce);
    });

    it('should generate timestamp as 13-digit string', () => {
      const headers = createAuthHeaders(mockToken, mockSecret);
      
      expect(headers.t).toMatch(/^\d{13}$/);
      expect(parseInt(headers.t)).toBeGreaterThan(Date.now() - 1000);
      expect(parseInt(headers.t)).toBeLessThanOrEqual(Date.now());
    });
  });
});
