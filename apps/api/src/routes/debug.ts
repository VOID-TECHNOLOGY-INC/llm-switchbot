import { FastifyPluginAsync } from 'fastify';

const debugRoutes: FastifyPluginAsync = async function (fastify) {
  // 環境変数確認エンドポイント
  fastify.get('/debug/env', async (request, reply) => {
    return {
      llm_provider: process.env.LLM_PROVIDER,
      openai_api_key: process.env.OPENAI_API_KEY ? '設定済み' : '未設定',
      openai_base_url: process.env.OPENAI_BASE_URL,
      openai_model: process.env.OPENAI_MODEL,
      switchbot_token: process.env.SWITCHBOT_TOKEN ? '設定済み' : '未設定',
      switchbot_secret: process.env.SWITCHBOT_SECRET ? '設定済み' : '未設定',
      node_env: process.env.NODE_ENV,
      all_env_keys: Object.keys(process.env).filter(key => key.includes('LLM') || key.includes('OPENAI') || key.includes('SWITCHBOT')),
      timestamp: new Date().toISOString()
    };
  });

  // LLMアダプター状態確認
  fastify.get('/debug/llm', async (request, reply) => {
    const orchestrator = fastify.chatOrchestrator;
    return {
      has_llm_adapter: !!orchestrator.getLLMAdapter(),
      adapter_type: orchestrator.getLLMAdapter()?.constructor.name || 'none',
      tools_available: orchestrator.getToolsSchema().tools.length > 0,
      timestamp: new Date().toISOString()
    };
  });
};

export default debugRoutes;
