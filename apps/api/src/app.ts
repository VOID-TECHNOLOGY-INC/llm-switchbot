import Fastify, { FastifyInstance } from 'fastify';
import { SwitchBotClient } from '@llm-switchbot/switchbot-adapter';
import { ChatOrchestrator } from './orchestrator/chat-orchestrator';
import cors from '@fastify/cors';
import env from '@fastify/env';
import { LLMFactory } from '@llm-switchbot/harmony-tools';

// Extend FastifyInstance with our services
declare module 'fastify' {
  interface FastifyInstance {
    switchBotClient: SwitchBotClient;
    chatOrchestrator: ChatOrchestrator;
    config: {
      SWITCHBOT_TOKEN: string;
      SWITCHBOT_SECRET: string;
      LLM_PROVIDER: string;
      OPENAI_API_KEY: string;
      OPENAI_BASE_URL: string;
      OPENAI_MODEL: string;
      LLM_BASE_URL: string;
      LLM_MODEL: string;
    };
  }
}

const envSchema = {
  type: 'object',
  properties: {
    PORT: { type: 'number', default: 3001 },
    HOST: { type: 'string', default: '0.0.0.0' },
    SWITCHBOT_TOKEN: { type: 'string' },
    SWITCHBOT_SECRET: { type: 'string' },
    SWITCHBOT_WEBHOOK_VERIFY_TOKEN: { type: 'string' },
    SWITCHBOT_WEBHOOK_SECRET: { type: 'string' },
    LLM_PROVIDER: { type: 'string', default: 'openai' },
    OPENAI_API_KEY: { type: 'string', default: '' },
    OPENAI_BASE_URL: { type: 'string', default: 'https://api.openai.com/v1' },
    OPENAI_MODEL: { type: 'string', default: 'gpt-4o-mini' },
    LLM_BASE_URL: { type: 'string', default: 'http://localhost:8000' },
    LLM_MODEL: { type: 'string', default: 'gpt-oss-20b' },
    LLM_API_KEY: { type: 'string', default: '' }
  },
  required: []
};

export async function build(opts = {}) {
  const fastify: FastifyInstance = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty'
      }
    },
    ...opts
  });

  // Register plugins
  fastify.register(cors, {
    origin: true,
    credentials: true
  });

  fastify.register(env, {
    schema: envSchema,
    dotenv: true
  });

  // Health check route
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  });

    // Initialize services after env is loaded
  await fastify.ready();
  
  const switchBotClient = new SwitchBotClient(
    fastify.config.SWITCHBOT_TOKEN,
    fastify.config.SWITCHBOT_SECRET
  );

  // Initialize LLM adapter
  let llmAdapter = null;
  try {
    if (fastify.config.LLM_PROVIDER === 'openai' && fastify.config.OPENAI_API_KEY) {
      llmAdapter = LLMFactory.create('openai', {
        apiKey: fastify.config.OPENAI_API_KEY,
        baseUrl: fastify.config.OPENAI_BASE_URL,
        model: fastify.config.OPENAI_MODEL
      });
      fastify.log.info('OpenAI LLM adapter initialized');
    } else if (fastify.config.LLM_PROVIDER === 'gpt-oss') {
      llmAdapter = LLMFactory.create('gpt-oss', {
        baseUrl: fastify.config.LLM_BASE_URL,
        model: fastify.config.LLM_MODEL
      });
      fastify.log.info('gpt-oss LLM adapter initialized');
    } else {
      fastify.log.info('No LLM adapter configured, using demo mode');
    }
  } catch (error) {
    fastify.log.error('Failed to initialize LLM adapter:', error as any);
  }

  // Initialize ChatOrchestrator
  const chatOrchestrator = new ChatOrchestrator(switchBotClient, llmAdapter || undefined);

  // Add services to fastify instance
  fastify.decorate('switchBotClient', switchBotClient);
  fastify.decorate('chatOrchestrator', chatOrchestrator);

  // Register route plugins (simple approach)
  fastify.register(require('./routes/switchbot'), { prefix: '/api/switchbot' });
  fastify.register(require('./routes/chat'), { prefix: '/api' });
  fastify.register(require('./routes/webhooks'), { prefix: '/api/webhooks' });

  return fastify;
}
