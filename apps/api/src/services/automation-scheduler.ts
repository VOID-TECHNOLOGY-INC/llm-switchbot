import { AutomationRule, RuleExecution, RuleAction, RuleActionResult } from '@llm-switchbot/shared';
import { SwitchBotClient } from '@llm-switchbot/switchbot-adapter';
import { ConditionEvaluatorService } from './condition-evaluator';

/**
 * 自動化ルール実行サービス
 */
export class AutomationSchedulerService {
  private rules: Map<string, AutomationRule> = new Map();
  private executionHistory: Map<string, RuleExecution[]> = new Map();
  private intervalIds: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(
    private switchBotClient: SwitchBotClient,
    private conditionEvaluator: ConditionEvaluatorService
  ) {}

  /**
   * ルールを追加・更新
   */
  addRule(rule: AutomationRule): void {
    // 既存のスケジュールを停止
    this.removeRule(rule.id);
    
    // 新しいルールを登録
    this.rules.set(rule.id, rule);
    
    if (rule.isEnabled) {
      this.scheduleRule(rule);
    }
  }

  /**
   * ルールを削除
   */
  removeRule(ruleId: string): void {
    const intervalId = this.intervalIds.get(ruleId);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervalIds.delete(ruleId);
    }
    this.rules.delete(ruleId);
  }

  /**
   * ルールを有効/無効化
   */
  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (!rule) return;

    rule.isEnabled = enabled;
    rule.updatedAt = new Date().toISOString();

    if (enabled) {
      this.scheduleRule(rule);
    } else {
      const intervalId = this.intervalIds.get(ruleId);
      if (intervalId) {
        clearInterval(intervalId);
        this.intervalIds.delete(ruleId);
      }
    }
  }

  /**
   * ルールのスケジューリング
   */
  private scheduleRule(rule: AutomationRule): void {
    // スケジュールタイプに応じて実行間隔を設定
    let intervalMs: number;

    switch (rule.schedule?.type) {
      case 'interval':
        intervalMs = (rule.schedule.interval || 5) * 60 * 1000; // デフォルト5分
        break;
      case 'daily':
      case 'weekly':
        intervalMs = 60 * 1000; // 1分間隔でチェック（時刻一致を検出するため）
        break;
      default:
        intervalMs = 5 * 60 * 1000; // デフォルト5分間隔
    }

    const intervalId = setInterval(async () => {
      await this.executeRuleIfConditionsMet(rule);
    }, intervalMs);

    this.intervalIds.set(rule.id, intervalId);
  }

  /**
   * 条件が満たされた場合にルールを実行
   */
  async executeRuleIfConditionsMet(rule: AutomationRule): Promise<void> {
    try {
      // スケジュール条件をチェック
      if (!this.conditionEvaluator.isTimeInSchedule(rule.schedule)) {
        return;
      }

      // 条件を評価
      const evaluation = await this.conditionEvaluator.evaluateConditions(rule.conditions);
      
      if (evaluation.allMet) {
        await this.executeRule(rule, evaluation.results);
      }
    } catch (error) {
      console.error(`ルール実行エラー [${rule.id}]:`, error);
    }
  }

  /**
   * ルールを強制実行
   */
  async executeRule(rule: AutomationRule, conditionResults: any[] = []): Promise<RuleExecution> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const executedAt = new Date().toISOString();

    console.log(`ルール実行開始: ${rule.name} [${rule.id}]`);

    // アクション実行結果
    const actionResults: RuleActionResult[] = [];

    for (let i = 0; i < rule.actions.length; i++) {
      const action = rule.actions[i];
      const result = await this.executeAction(action, i, executedAt);
      actionResults.push(result);
    }

    // 実行履歴を作成
    const execution: RuleExecution = {
      id: executionId,
      ruleId: rule.id,
      executedAt,
      status: this.determineExecutionStatus(actionResults),
      results: actionResults,
      conditions: conditionResults
    };

    // 実行履歴を保存
    if (!this.executionHistory.has(rule.id)) {
      this.executionHistory.set(rule.id, []);
    }
    const history = this.executionHistory.get(rule.id)!;
    history.unshift(execution); // 最新を先頭に
    
    // 履歴は最大50件まで保持
    if (history.length > 50) {
      history.splice(50);
    }

    // ルールの統計情報を更新
    rule.lastExecuted = executedAt;
    rule.executionCount++;
    rule.updatedAt = executedAt;

    console.log(`ルール実行完了: ${rule.name} [${rule.id}] - ${execution.status}`);

    return execution;
  }

  /**
   * 個別アクションを実行
   */
  private async executeAction(action: RuleAction, index: number, executedAt: string): Promise<RuleActionResult> {
    const result: RuleActionResult = {
      actionIndex: index,
      status: 'failure',
      executedAt,
    };

    try {
      // 遅延実行
      if (action.delay && action.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, action.delay! * 1000));
      }

      switch (action.type) {
        case 'device_control':
          result.result = await this.executeDeviceControl(action);
          result.status = 'success';
          break;
        case 'scene_execution':
          result.result = await this.executeScene(action);
          result.status = 'success';
          break;
        case 'notification':
          result.result = await this.sendNotification(action);
          result.status = 'success';
          break;
        default:
          result.error = `未対応のアクションタイプ: ${action.type}`;
          result.status = 'skipped';
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      result.status = 'failure';
      console.error(`アクション実行エラー [${index}]:`, error);
    }

    return result;
  }

  /**
   * デバイス制御を実行
   */
  private async executeDeviceControl(action: RuleAction): Promise<any> {
    if (!action.deviceId || !action.command) {
      throw new Error('デバイスIDとコマンドが必要です');
    }

    return await this.switchBotClient.sendCommand(
      action.deviceId,
      action.command,
      action.parameters || {}
    );
  }

  /**
   * シーン実行
   */
  private async executeScene(action: RuleAction): Promise<any> {
    if (!action.sceneId) {
      throw new Error('シーンIDが必要です');
    }

    return await this.switchBotClient.executeScene(action.sceneId);
  }

  /**
   * 通知送信
   */
  private async sendNotification(action: RuleAction): Promise<any> {
    if (!action.message) {
      throw new Error('通知メッセージが必要です');
    }

    // 実際の通知実装（ログ出力で代替）
    console.log(`通知: ${action.message}`);
    return { message: action.message, sentAt: new Date().toISOString() };
  }

  /**
   * 実行ステータスを決定
   */
  private determineExecutionStatus(results: RuleActionResult[]): 'success' | 'failure' | 'partial' {
    const successCount = results.filter(r => r.status === 'success').length;
    const failureCount = results.filter(r => r.status === 'failure').length;

    if (failureCount === 0) return 'success';
    if (successCount === 0) return 'failure';
    return 'partial';
  }

  /**
   * 登録されているルール一覧を取得
   */
  getRules(): AutomationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * ルールの実行履歴を取得
   */
  getExecutionHistory(ruleId: string): RuleExecution[] {
    return this.executionHistory.get(ruleId) || [];
  }

  /**
   * 特定のルールを取得
   */
  getRule(ruleId: string): AutomationRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * すべてのスケジュールを停止
   */
  stopAllSchedules(): void {
    for (const intervalId of this.intervalIds.values()) {
      clearInterval(intervalId);
    }
    this.intervalIds.clear();
  }

  /**
   * 手動でルールを実行
   */
  async manualExecuteRule(ruleId: string): Promise<RuleExecution | null> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`ルールが見つかりません: ${ruleId}`);
    }

    return await this.executeRule(rule);
  }
}
