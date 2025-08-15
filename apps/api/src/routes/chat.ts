import { FastifyPluginAsync } from 'fastify';
import { ChatRequest, ChatResponse } from '@llm-switchbot/shared';

const chatRoutes: FastifyPluginAsync = async function (fastify) {
  // チャットエンドポイント（後でLLM連携を実装）
  fastify.post<{ Body: ChatRequest }>('/chat', async (request, reply) => {
    try {
      const { messages, toolsAllowed } = request.body;
      
      if (!messages || !Array.isArray(messages)) {
        reply.code(400).send({
          statusCode: 400,
          message: 'messages array is required'
        });
        return;
      }
      
      // TODO: LLM との統合を実装
      const response: ChatResponse = {
        reply: 'Chat integration not yet implemented',
        toolCalls: []
      };
      
      return response;
    } catch (error) {
      fastify.log.error(error, 'Failed to process chat');
      reply.code(500).send({
        statusCode: 500,
        message: 'Failed to process chat'
      });
    }
  });
};

module.exports = chatRoutes;
