import { FastifyPluginAsync } from 'fastify';
import { WebhookEvent } from '@llm-switchbot/shared';

const webhooksRoutes: FastifyPluginAsync = async function (fastify) {
  // SwitchBot Webhook受信エンドポイント
  fastify.post<{ Body: WebhookEvent }>('/switchbot', async (request, reply) => {
    try {
      const webhookEvent = request.body;
      
      fastify.log.info(webhookEvent, 'Received SwitchBot webhook');
      
      // TODO: イベントの検証、保存、リアルタイム通知の実装
      
      return {
        statusCode: 200,
        message: 'Webhook received successfully'
      };
    } catch (error) {
      fastify.log.error(error, 'Failed to process webhook');
      reply.code(500).send({
        statusCode: 500,
        message: 'Failed to process webhook'
      });
    }
  });
};

module.exports = webhooksRoutes;
