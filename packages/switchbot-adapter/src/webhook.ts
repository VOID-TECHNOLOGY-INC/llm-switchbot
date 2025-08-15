import { createHmac } from 'crypto';

/**
 * SwitchBot Webhook署名を検証
 * 
 * @param payload Webhookペイロード（JSON文字列）
 * @param signature リクエストヘッダーの署名
 * @param timestamp タイムスタンプ（13桁）
 * @param nonce ナンス値
 * @param secret Webhook設定時のシークレット
 * @returns 署名が有効かどうか
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  nonce: string,
  secret: string
): boolean {
  // パラメータ検証
  if (!payload) throw new Error('Payload is required');
  if (!signature) throw new Error('Signature is required');
  if (!timestamp) throw new Error('Timestamp is required');
  if (!nonce) throw new Error('Nonce is required');
  if (!secret) throw new Error('Secret is required');

  // タイムスタンプ検証（5分以内）
  const currentTime = Date.now();
  const requestTime = parseInt(timestamp);
  const timeDiff = Math.abs(currentTime - requestTime);
  const maxTimeDiff = 5 * 60 * 1000; // 5分

  if (timeDiff > maxTimeDiff) {
    return false;
  }

  // 署名生成（SwitchBot Webhook仕様に基づく）
  const stringToSign = secret + nonce + timestamp + payload;
  const hmac = createHmac('sha256', secret);
  hmac.update(stringToSign, 'utf8');
  const expectedSignature = hmac.digest('base64');

  // 署名比較（タイミング攻撃対策）
  return timingSafeEqual(signature, expectedSignature);
}

/**
 * Webhook応答を生成
 * 
 * @param statusCode HTTPステータスコード
 * @param message レスポンスメッセージ
 * @returns 標準化されたWebhook応答
 */
export function createWebhookResponse(statusCode: number, message: string = 'OK') {
  return {
    statusCode,
    message,
    timestamp: new Date().toISOString()
  };
}

/**
 * SwitchBot Webhookペイロードを解析
 * 
 * @param payload Webhookペイロード
 * @returns 解析されたイベントデータ
 */
export function parseWebhookEvent(payload: any) {
  const {
    eventType,
    eventVersion,
    context
  } = payload;

  return {
    eventType,
    eventVersion,
    deviceType: context?.deviceType,
    deviceMac: context?.deviceMac,
    timestamp: Date.now(),
    data: context
  };
}

/**
 * タイミング攻撃対策のための安全な文字列比較
 * 
 * @param a 比較する文字列1
 * @param b 比較する文字列2
 * @returns 文字列が等しいかどうか
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
