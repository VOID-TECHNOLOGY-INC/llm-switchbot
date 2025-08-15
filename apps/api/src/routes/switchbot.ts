import { FastifyPluginAsync } from 'fastify';
import { SwitchBotClient } from '@llm-switchbot/switchbot-adapter';
import { CommandRequest, CommandResponse } from '@llm-switchbot/shared';

const switchbotRoutes: FastifyPluginAsync = async function (fastify) {
  // SwitchBotクライアントを初期化
  const getSwitchBotClient = () => {
    const token = process.env.SWITCHBOT_TOKEN || 'demo-token';
    const secret = process.env.SWITCHBOT_SECRET || 'demo-secret';
    
    if (!token || !secret) {
      throw new Error('SwitchBot credentials not configured');
    }
    
    return new SwitchBotClient(token, secret);
  };

  // デバイス一覧取得
  fastify.get('/devices', async (request, reply) => {
    try {
      const client = getSwitchBotClient();
      const result = await client.getDevices();
      
      return result;
    } catch (error) {
      fastify.log.error(error, 'Failed to get devices');
      
      if (error instanceof Error && error.message.includes('not configured')) {
        reply.code(500).send({
          statusCode: 500,
          message: 'SwitchBot API not configured'
        });
        return;
      }
      
      reply.code(500).send({
        statusCode: 500,
        message: 'Failed to get devices'
      });
    }
  });

  // デバイス状態取得
  fastify.get('/devices/:id/status', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const client = getSwitchBotClient();
      const result = await client.getDeviceStatus(id);
      
      return result;
    } catch (error) {
      fastify.log.error(error, 'Failed to get device status');
      reply.code(500).send({
        statusCode: 500,
        message: 'Failed to get device status'
      });
    }
  });

  // デバイスコマンド送信
  fastify.post<{ Body: CommandRequest }>('/command', async (request, reply) => {
    try {
      const { deviceId, command, parameter, commandType } = request.body as CommandRequest;
      
      if (!deviceId || !command) {
        reply.code(400).send({
          statusCode: 400,
          message: 'deviceId and command are required'
        });
        return;
      }
      
      const client = getSwitchBotClient();
      const result = await client.sendCommand(deviceId, command, parameter, commandType);
      
      const response: CommandResponse = {
        requestId: `req_${Date.now()}`,
        statusCode: result.statusCode || 200,
        message: result.message || 'Command sent successfully'
      };
      
      return response;
    } catch (error) {
      fastify.log.error(error, 'Failed to send command');
      reply.code(500).send({
        statusCode: 500,
        message: 'Failed to send command'
      });
    }
  });
};

module.exports = switchbotRoutes;
