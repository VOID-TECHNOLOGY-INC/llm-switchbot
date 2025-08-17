import { FastifyPluginAsync } from 'fastify';
import { AutomationRule, AutomationWorkflow } from '@llm-switchbot/shared';
import { WorkflowParserService } from '../services/workflow-parser';
import { AutomationSchedulerService } from '../services/automation-scheduler';
import { ConditionEvaluatorService } from '../services/condition-evaluator';

const automationWorkflowRoutes: FastifyPluginAsync = async function (fastify) {
  // サービスインスタンスを取得
  const switchBotClient = fastify.switchBotClient;
  const llmAdapter = fastify.chatOrchestrator?.getLLMAdapter();
  
  // サービスを初期化
  const workflowParser = new WorkflowParserService(llmAdapter || undefined);
  const conditionEvaluator = new ConditionEvaluatorService(switchBotClient);
  const automationScheduler = new AutomationSchedulerService(switchBotClient, conditionEvaluator);

  // 自然言語からワークフローを解析
  fastify.post('/workflow/parse', async (request, reply) => {
    try {
      const { naturalLanguage, userId = 'default-user' } = request.body as {
        naturalLanguage: string;
        userId?: string;
      };

      if (!naturalLanguage || naturalLanguage.trim() === '') {
        return reply.code(400).send({
          error: '自然言語の入力が必要です'
        });
      }

      const workflow = await workflowParser.parseWorkflow(naturalLanguage, userId);
      
      return {
        success: true,
        workflow,
        message: 'ワークフローを解析しました'
      };
    } catch (error) {
      console.error('ワークフロー解析エラー:', error);
      return reply.code(500).send({
        error: 'ワークフローの解析中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ワークフローを保存（ルールとして登録）
  fastify.post('/workflow/save', async (request, reply) => {
    try {
      const { workflow } = request.body as { workflow: AutomationWorkflow };

      if (!workflow || !workflow.parsedRule) {
        return reply.code(400).send({
          error: 'ワークフローデータが必要です'
        });
      }

      // ルールIDを生成
      const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const rule: AutomationRule = {
        ...workflow.parsedRule,
        id: ruleId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // スケジューラーに登録
      automationScheduler.addRule(rule);

      return {
        success: true,
        rule,
        message: 'ワークフローを保存しました'
      };
    } catch (error) {
      console.error('ワークフロー保存エラー:', error);
      return reply.code(500).send({
        error: 'ワークフローの保存中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // 自動化ルール一覧を取得
  fastify.get('/workflow/rules', async (request, reply) => {
    try {
      const rules = automationScheduler.getRules();
      return {
        success: true,
        rules,
        count: rules.length
      };
    } catch (error) {
      console.error('ルール一覧取得エラー:', error);
      return reply.code(500).send({
        error: 'ルール一覧の取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // 特定のルールを取得
  fastify.get('/workflow/rules/:ruleId', async (request, reply) => {
    try {
      const { ruleId } = request.params as { ruleId: string };
      const rule = automationScheduler.getRule(ruleId);

      if (!rule) {
        return reply.code(404).send({
          error: 'ルールが見つかりません'
        });
      }

      return {
        success: true,
        rule
      };
    } catch (error) {
      console.error('ルール取得エラー:', error);
      return reply.code(500).send({
        error: 'ルールの取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ルールを更新
  fastify.put('/workflow/rules/:ruleId', async (request, reply) => {
    try {
      const { ruleId } = request.params as { ruleId: string };
      const { rule } = request.body as { rule: AutomationRule };

      if (!rule) {
        return reply.code(400).send({
          error: 'ルールデータが必要です'
        });
      }

      const existingRule = automationScheduler.getRule(ruleId);
      if (!existingRule) {
        return reply.code(404).send({
          error: 'ルールが見つかりません'
        });
      }

      // ルールを更新
      const updatedRule: AutomationRule = {
        ...rule,
        id: ruleId,
        createdAt: existingRule.createdAt,
        updatedAt: new Date().toISOString()
      };

      automationScheduler.addRule(updatedRule);

      return {
        success: true,
        rule: updatedRule,
        message: 'ルールを更新しました'
      };
    } catch (error) {
      console.error('ルール更新エラー:', error);
      return reply.code(500).send({
        error: 'ルールの更新中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ルールを削除
  fastify.delete('/workflow/rules/:ruleId', async (request, reply) => {
    try {
      const { ruleId } = request.params as { ruleId: string };
      
      const existingRule = automationScheduler.getRule(ruleId);
      if (!existingRule) {
        return reply.code(404).send({
          error: 'ルールが見つかりません'
        });
      }

      automationScheduler.removeRule(ruleId);

      return {
        success: true,
        message: 'ルールを削除しました'
      };
    } catch (error) {
      console.error('ルール削除エラー:', error);
      return reply.code(500).send({
        error: 'ルールの削除中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ルールを有効/無効化
  fastify.patch('/workflow/rules/:ruleId/toggle', async (request, reply) => {
    try {
      const { ruleId } = request.params as { ruleId: string };
      const { enabled } = request.body as { enabled: boolean };

      const rule = automationScheduler.getRule(ruleId);
      if (!rule) {
        return reply.code(404).send({
          error: 'ルールが見つかりません'
        });
      }

      automationScheduler.toggleRule(ruleId, enabled);

      return {
        success: true,
        message: `ルールを${enabled ? '有効' : '無効'}にしました`
      };
    } catch (error) {
      console.error('ルール切り替えエラー:', error);
      return reply.code(500).send({
        error: 'ルールの切り替え中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ルールを手動実行
  fastify.post('/workflow/rules/:ruleId/execute', async (request, reply) => {
    try {
      const { ruleId } = request.params as { ruleId: string };
      
      const execution = await automationScheduler.manualExecuteRule(ruleId);

      return {
        success: true,
        execution,
        message: 'ルールを実行しました'
      };
    } catch (error) {
      console.error('ルール実行エラー:', error);
      return reply.code(500).send({
        error: 'ルールの実行中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ルールの実行履歴を取得
  fastify.get('/workflow/rules/:ruleId/history', async (request, reply) => {
    try {
      const { ruleId } = request.params as { ruleId: string };
      const { limit = 20 } = request.query as { limit?: number };
      
      const history = automationScheduler.getExecutionHistory(ruleId);
      const limitedHistory = history.slice(0, limit);

      return {
        success: true,
        history: limitedHistory,
        count: limitedHistory.length,
        total: history.length
      };
    } catch (error) {
      console.error('実行履歴取得エラー:', error);
      return reply.code(500).send({
        error: '実行履歴の取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // 条件を手動評価（テスト用）
  fastify.post('/workflow/conditions/evaluate', async (request, reply) => {
    try {
      const { conditions } = request.body as { conditions: any[] };

      if (!conditions || !Array.isArray(conditions)) {
        return reply.code(400).send({
          error: '条件配列が必要です'
        });
      }

      const evaluation = await conditionEvaluator.evaluateConditions(conditions);

      return {
        success: true,
        evaluation,
        message: '条件を評価しました'
      };
    } catch (error) {
      console.error('条件評価エラー:', error);
      return reply.code(500).send({
        error: '条件の評価中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
};

export default automationWorkflowRoutes;
