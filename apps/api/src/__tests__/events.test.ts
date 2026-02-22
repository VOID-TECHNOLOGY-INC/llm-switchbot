import { build } from '../app';
import { FastifyInstance } from 'fastify';
import http from 'http';
import { AddressInfo } from 'net';

describe('SSE Events Route', () => {
  let app: FastifyInstance;
  let serverUrl: string;

  beforeAll(async () => {
    app = await build();
    await app.ready();
    await app.listen({ port: 0 });
    const address = app.server.address() as AddressInfo;
    serverUrl = `http://localhost:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return correct SSE headers and initial message', (done) => {
    const req = http.request(`${serverUrl}/api/events`, (res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('text/event-stream');
      expect(res.headers['cache-control']).toBe('no-cache');
      expect(res.headers['connection']).toBe('keep-alive');
      // Global CORS plugin should handle this, but let's check if we removed the manual one
      // The global one might add it if configured, but we want to ensure no double headers or errors.
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk.toString();
        if (data.includes('type":"connection"')) {
          expect(data).toContain('data: {"type":"connection","status":"connected"');
          req.destroy(); // Close connection
          done();
        }
      });
    });
    
    req.on('error', (e) => {
      done(e);
    });
    
    req.end();
  });
});
