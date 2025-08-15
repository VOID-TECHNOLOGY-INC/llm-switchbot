import { build } from './app';
import * as dotenv from 'dotenv';

dotenv.config();

const server = build();

const start = async () => {
  try {
    const port = Number(process.env.API_PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';
    
    await server.listen({ port, host });
    console.log(`🚀 API Server running on http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await server.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await server.close();
  process.exit(0);
});

start();
