import { FastifyPluginAsync } from 'fastify';

const eventsRoutes: FastifyPluginAsync = async function (fastify) {
  // SSEエンドポイント
  fastify.get('/events', async (request, reply) => {
    // SSEのヘッダー設定
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*', // 開発環境でのCORS対応
    });

    // クライアントを登録
    const clientId = fastify.notificationService.addClient(reply);
    fastify.log.info({ clientId }, 'SSE client connected');

    // 初期メッセージを送信（接続完了）
    const initialMessage = {
      type: 'connection',
      status: 'connected',
      clientId,
      timestamp: new Date().toISOString(),
    };
    reply.raw.write(`data: ${JSON.stringify(initialMessage)}\n\n`);

    // 接続が閉じられた時のクリーンアップ
    reply.raw.on('close', () => {
      fastify.log.info({ clientId }, 'SSE client disconnected');
    });

    // reply.send() は呼ばない（keep-aliveのため）
    return reply;
  });
};

export default eventsRoutes;
