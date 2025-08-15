import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import env from '@fastify/env';

const envSchema = {
  type: 'object',
  properties: {
    PORT: { type: 'number', default: 3001 },
    HOST: { type: 'string', default: '0.0.0.0' },
    SWITCHBOT_TOKEN: { type: 'string' },
    SWITCHBOT_SECRET: { type: 'string' },
    SWITCHBOT_WEBHOOK_VERIFY_TOKEN: { type: 'string' },
    LLM_BASE_URL: { type: 'string', default: 'http://localhost:8000' },
    LLM_MODEL: { type: 'string', default: 'gpt-oss-20b' },
    LLM_API_KEY: { type: 'string', default: '' }
  },
  required: []
};

export function build(opts = {}) {
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

  // Register route plugins (simple approach)
  fastify.register(require('./routes/switchbot'), { prefix: '/api/switchbot' });
  fastify.register(require('./routes/chat'), { prefix: '/api' });
  fastify.register(require('./routes/webhooks'), { prefix: '/api/webhooks' });

  return fastify;
}
