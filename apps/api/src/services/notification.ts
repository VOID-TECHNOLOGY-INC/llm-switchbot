import { FastifyReply } from 'fastify';

export interface SSEMessage {
  type: string;
  [key: string]: any;
}

export class NotificationService {
  private clients: Map<string, FastifyReply> = new Map();

  /**
   * SSEクライアントを登録する
   * @param reply Fastifyの返信オブジェクト
   * @returns クライアントID
   */
  addClient(reply: FastifyReply): string {
    const clientId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    this.clients.set(clientId, reply);

    // クライアントが切断された場合の処理
    reply.raw.on('close', () => {
      this.removeClient(clientId);
    });

    return clientId;
  }

  /**
   * SSEクライアントを解除する
   * @param clientId クライアントID
   */
  removeClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  /**
   * 全クライアントにメッセージを送信する
   * @param message 送信するメッセージ
   * @param eventName イベント名（省略可）
   */
  broadcast(message: SSEMessage, eventName?: string): void {
    const event = eventName ? `event: ${eventName}\n` : '';
    const data = `data: ${JSON.stringify(message)}\n\n`;
    const payload = `${event}${data}`;

    this.clients.forEach((reply, clientId) => {
      try {
        reply.raw.write(payload);
      } catch (error) {
        console.error(`Failed to send message to client ${clientId}:`, error);
        this.removeClient(clientId);
      }
    });
  }

  /**
   * 現在接続中のクライアント数を取得する
   * @returns クライアント数
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * ハートビート（キープアライブ）を開始する
   * @param intervalMs インターバル（ミリ秒）
   */
  startHeartbeat(intervalMs: number = 30000): NodeJS.Timeout {
    return setInterval(() => {
      this.clients.forEach((reply, clientId) => {
        try {
          reply.raw.write(': keep-alive\n\n');
        } catch (error) {
          console.error(`Failed to send heartbeat to client ${clientId}:`, error);
          this.removeClient(clientId);
        }
      });
    }, intervalMs);
  }
}
