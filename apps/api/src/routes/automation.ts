import { FastifyPluginAsync } from 'fastify';
import { AutomationProposalService } from '../services/automation-proposal';
import { SceneLearningService } from '../services/scene-learning';
import {
  AutomationEvent,
  AutomationContext,
  SceneLearningContext,
  OperationRecord
} from '@llm-switchbot/shared';

const automationRoutes: FastifyPluginAsync = async function (fastify) {
  // サービスインスタンスを取得（エラーハンドリング付き）
  let automationService: AutomationProposalService;
  let sceneLearningService: SceneLearningService;
  
  try {
    automationService = new AutomationProposalService(fastify.switchBotClient);
    sceneLearningService = new SceneLearningService(fastify.switchBotClient);
  } catch (error) {
    fastify.log.error('Automation services initialization error:', error as any);
    throw error;
  }

  // POST /automation/analyze - イベント分析
  fastify.post<{ Body: AutomationEvent }>('/automation/analyze', async (request, reply) => {
    try {
      const event = request.body;
      const proposal = await automationService.analyzeEvent(event);
      
      return {
        success: true,
        data: proposal
      };
    } catch (error) {
      fastify.log.error('自動化分析エラー:', error as any);
      return reply.status(500).send({
        success: false,
        error: '自動化分析に失敗しました'
      });
    }
  });

  // POST /automation/propose - コンテキストベース提案
  fastify.post<{ Body: AutomationContext }>('/automation/propose', async (request, reply) => {
    try {
      const context = request.body;
      const proposal = await automationService.generateProposal(context);
      
      return {
        success: true,
        data: proposal
      };
    } catch (error) {
      fastify.log.error('提案生成エラー:', error as any);
      return reply.status(500).send({
        success: false,
        error: '提案生成に失敗しました'
      });
    }
  });

  // POST /automation/validate - 提案検証
  fastify.post<{ Body: any }>('/automation/validate', async (request, reply) => {
    try {
      const proposal = request.body as any;
      const validation = await automationService.validateProposal(proposal);
      
      return {
        success: true,
        data: validation
      };
    } catch (error) {
      fastify.log.error('提案検証エラー:', error as any);
      return reply.status(500).send({
        success: false,
        error: '提案検証に失敗しました'
      });
    }
  });

  // POST /scenes/record - 操作記録
  fastify.post<{ Body: OperationRecord }>('/scenes/record', async (request, reply) => {
    try {
      const operation = request.body;
      await sceneLearningService.recordOperation(operation);
      
      return {
        success: true,
        message: '操作が記録されました'
      };
    } catch (error) {
      fastify.log.error('操作記録エラー:', error as any);
      return reply.status(500).send({
        success: false,
        error: '操作記録に失敗しました'
      });
    }
  });

  // GET /scenes/patterns - 操作パターン取得
  fastify.get('/scenes/patterns', async (request, reply) => {
    try {
      const patterns = await sceneLearningService.getOperationPatterns();
      
      return {
        success: true,
        data: patterns
      };
    } catch (error) {
      fastify.log.error('パターン取得エラー:', error as any);
      return reply.status(500).send({
        success: false,
        error: 'パターン取得に失敗しました'
      });
    }
  });

  // GET /scenes/sequential-patterns - 順次パターン取得
  fastify.get('/scenes/sequential-patterns', async (request, reply) => {
    try {
      const patterns = await sceneLearningService.detectPatterns();
      
      return {
        success: true,
        data: patterns
      };
    } catch (error) {
      fastify.log.error('順次パターン取得エラー:', error as any);
      return reply.status(500).send({
        success: false,
        error: '順次パターン取得に失敗しました'
      });
    }
  });

  // GET /scenes/time-patterns - 時間ベースパターン取得
  fastify.get('/scenes/time-patterns', async (request, reply) => {
    try {
      const patterns = await sceneLearningService.detectTimeBasedPatterns();
      
      return {
        success: true,
        data: patterns
      };
    } catch (error) {
      fastify.log.error('時間パターン取得エラー:', error as any);
      return reply.status(500).send({
        success: false,
        error: '時間パターン取得に失敗しました'
      });
    }
  });

  // GET /scenes/candidates - シーン候補取得
  fastify.get('/scenes/candidates', async (request, reply) => {
    try {
      const candidates = await sceneLearningService.generateSceneCandidates();
      
      return {
        success: true,
        data: candidates
      };
    } catch (error) {
      fastify.log.error('シーン候補取得エラー:', error as any);
      return reply.status(500).send({
        success: false,
        error: 'シーン候補取得に失敗しました'
      });
    }
  });

  // POST /scenes/create - シーン作成
  fastify.post<{ Body: any }>('/scenes/create', async (request, reply) => {
    try {
      const candidate = request.body as any;
      const scene = await sceneLearningService.createSceneFromCandidate(candidate);
      
      return {
        success: true,
        data: scene
      };
    } catch (error) {
      fastify.log.error('シーン作成エラー:', error as any);
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'シーン作成に失敗しました'
      });
    }
  });

  // POST /scenes/suggestions - シーン提案取得
  fastify.post<{ Body: SceneLearningContext }>('/scenes/suggestions', async (request, reply) => {
    try {
      const context = request.body;
      const suggestions = await sceneLearningService.getSceneSuggestions(context);
      
      return {
        success: true,
        data: suggestions
      };
    } catch (error) {
      fastify.log.error('シーン提案取得エラー:', error as any);
      return reply.status(500).send({
        success: false,
        error: 'シーン提案取得に失敗しました'
      });
    }
  });
};

export default automationRoutes;
