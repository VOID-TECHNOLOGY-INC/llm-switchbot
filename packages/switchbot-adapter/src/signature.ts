import { createHmac, randomUUID } from 'crypto';

/**
 * SwitchBot API v1.1用のHMAC-SHA256署名を生成
 * 
 * @param token SwitchBot API トークン
 * @param secret SwitchBot API シークレット  
 * @param t 13桁のタイムスタンプ
 * @param nonce リクエストごとの一意な文字列
 * @returns Base64エンコードされた署名
 */
export function generateSignature(
  token: string,
  secret: string,
  t: string,
  nonce: string
): string {
  // 公式ドキュメント通り: token + t + nonce を結合
  const stringToSign = token + t + nonce;
  
  // HMAC-SHA256で署名を生成
  const hmac = createHmac('sha256', secret);
  hmac.update(stringToSign, 'utf8');
  
  // Base64でエンコードして返す
  return hmac.digest('base64');
}

/**
 * SwitchBot APIリクエスト用の認証ヘッダーを生成
 * 
 * @param token SwitchBot API トークン
 * @param secret SwitchBot API シークレット
 * @returns 認証に必要なヘッダーオブジェクト
 */
export function createAuthHeaders(token: string, secret: string): Record<string, string> {
  // 13桁のタイムスタンプ（ミリ秒）
  const t = Date.now().toString();
  
  // 一意なnonce（リプレイ攻撃防止）
  const nonce = randomUUID();
  
  // 署名を生成
  const sign = generateSignature(token, secret, t, nonce);
  
  return {
    'Authorization': token,
    'sign': sign,
    't': t,
    'nonce': nonce,
    'Content-Type': 'application/json'
  };
}
