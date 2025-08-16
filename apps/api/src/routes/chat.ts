import { FastifyPluginAsync } from 'fastify';

interface ChatRequestBody {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  enableTools?: boolean;
}

const chatRoutes: FastifyPluginAsync = async function (fastify) {
  // Chat Orchestrator インスタンスをfastifyから取得
  const orchestrator = fastify.chatOrchestrator;

  // POST /chat - チャット処理
  fastify.post<{ Body: ChatRequestBody }>('/chat', async (request, reply) => {
    try {
      const { messages, enableTools = false } = request.body;

      if (!messages || !Array.isArray(messages)) {
        return reply.code(400).send({
          error: 'Invalid request: messages array is required'
        });
      }

      // チャット処理を実行
      const result = await orchestrator.processChat(messages, enableTools);

      return {
        response: result.response,
        toolResults: result.toolResults,
        toolsAvailable: enableTools,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      fastify.log.error(error, 'Chat processing error');
      
      return reply.code(500).send({
        error: 'Internal server error during chat processing',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // GET /tools - 利用可能なツール一覧
  fastify.get('/tools', async (request, reply) => {
    const toolsSchema = orchestrator.getToolsSchema();
    
    return {
      tools: toolsSchema.tools.map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters
      })),
      count: toolsSchema.tools.length
    };
  });

  // POST /tool - 単一ツール実行（デバッグ用）
  fastify.post('/tool', async (request, reply) => {
    try {
      const toolCall = request.body as any;

      if (!toolCall || !toolCall.function || !toolCall.function.name) {
        return reply.code(400).send({
          error: 'Invalid tool call format'
        });
      }

      const result = await orchestrator.processToolCall(toolCall);
      
      return result;

    } catch (error) {
      fastify.log.error(error, 'Tool execution error');
      
      return reply.code(500).send({
        error: 'Internal server error during tool execution',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
};

module.exports = chatRoutes;
