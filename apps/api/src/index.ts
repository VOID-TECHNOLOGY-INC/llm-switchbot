import { build } from './app';
import * as dotenv from 'dotenv';

dotenv.config();

const start = async () => {
  try {
    server = await build();
    const port = Number(process.env.API_PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';
    
    await server.listen({ port, host });
    console.log(`🚀 API Server running on http://${host}:${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Handle graceful shutdown
let server: any;

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (server) await server.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  if (server) await server.close();
  process.exit(0);
});

start();
