import { FastifyPluginAsync } from 'fastify';
import { verifyWebhookSignature, parseWebhookEvent, createWebhookResponse } from '@llm-switchbot/switchbot-adapter';

interface SwitchBotWebhookHeaders {
  'x-signature'?: string;
  't'?: string;
  'nonce'?: string;
}

interface RawWebhookBody {
  eventType: string;
  eventVersion: string;
  context: {
    deviceType: string;
    deviceMac: string;
    timeOfSample?: number;
    // センサー系イベント
    temperature?: number;
    humidity?: number;
    lightLevel?: number;
    // ボタン・デバイス系イベント
    battery?: number;
    // カーテン系
    position?: number;
    // その他のコンテキスト情報
    [key: string]: any;
  };
}

const webhooksRoutes: FastifyPluginAsync = async function (fastify) {
  // SwitchBot Webhook受信エンドポイント
  fastify.post<{
    Headers: SwitchBotWebhookHeaders;
    Body: RawWebhookBody;
  }>('/switchbot', async (request, reply) => {
    try {
      const headers = request.headers;
      const rawPayload = JSON.stringify(request.body);
      const signature = headers['x-signature'];
      const timestamp = headers['t'];
      const nonce = headers['nonce'];
      
      // 環境変数からWebhook検証用シークレットを取得
      const webhookSecret = process.env.SWITCHBOT_WEBHOOK_SECRET;
      
      if (!webhookSecret) {
        fastify.log.error('SWITCHBOT_WEBHOOK_SECRET not configured');
        return reply.code(500).send(createWebhookResponse(500, 'Server configuration error'));
      }
      
      // Webhook署名検証（本番環境では必須）
      if (signature && timestamp && nonce) {
        const isValidSignature = verifyWebhookSignature(
          rawPayload,
          signature,
          timestamp,
          nonce,
          webhookSecret
        );
        
        if (!isValidSignature) {
          fastify.log.warn('Invalid webhook signature received');
          return reply.code(401).send(createWebhookResponse(401, 'Invalid signature'));
        }
      } else {
        fastify.log.warn('Webhook received without signature headers (development mode?)');
      }
      
            // イベントデータのパース
      const webhookEvent = parseWebhookEvent(request.body);
      if (!webhookEvent) {
        fastify.log.error('Failed to parse webhook payload');
        return reply.code(400).send(createWebhookResponse(400, 'Invalid payload format'));
      }

      // イベントのログ記録
      fastify.log.info({
        eventType: webhookEvent.eventType,
        deviceType: webhookEvent.deviceType,
        deviceMac: webhookEvent.deviceMac,
        timestamp: new Date().toISOString()
      }, 'Received SwitchBot webhook event');
      
      // TODO: イベントの永続化（データベース保存）
      // TODO: リアルタイム通知（WebSocket/SSE でフロントエンドに送信）
      // TODO: 自動化ルールの評価（条件マッチング → アクション実行）
      
      // 成功レスポンス
      return { statusCode: 100, message: 'Webhook processed successfully' };
      
    } catch (error) {
      fastify.log.error(error, 'Failed to process SwitchBot webhook');
      return reply.code(500).send(createWebhookResponse(500, 'Failed to process webhook'));
    }
  });
  
  // Webhook設定確認用エンドポイント（開発・デバッグ用）
  fastify.get('/switchbot/status', async (request, reply) => {
    return {
      status: 'ready',
      webhookSecret: process.env.SWITCHBOT_WEBHOOK_SECRET ? 'configured' : 'missing',
      timestamp: new Date().toISOString()
    };
  });
};

module.exports = webhooksRoutes;
