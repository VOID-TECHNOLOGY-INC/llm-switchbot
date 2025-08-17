import { AutomationRule, RuleCondition, RuleAction, RuleSchedule, AutomationWorkflow } from '@llm-switchbot/shared';
import { LLMAdapter } from '@llm-switchbot/harmony-tools';

/**
 * 自然言語ワークフロー解析サービス
 */
export class WorkflowParserService {
  constructor(private llmAdapter?: LLMAdapter) {}

  /**
   * 自然言語からワークフローを解析
   */
  async parseWorkflow(naturalLanguage: string, userId: string): Promise<AutomationWorkflow> {
    if (!this.llmAdapter) {
      // LLMが利用できない場合のフォールバック
      return this.parseWithFallback(naturalLanguage, userId);
    }

    try {
      const prompt = this.createParsingPrompt(naturalLanguage);
      const response = await this.llmAdapter.chat({
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.1, // 安定した結果を得るため低く設定
        max_tokens: 1000
      });

      const parsedContent = response.content;
      if (!parsedContent) {
        throw new Error('LLMからの応答が空です');
      }

      return this.validateAndBuildWorkflow(parsedContent, naturalLanguage, userId);
    } catch (error) {
      console.warn('LLM解析に失敗、フォールバックを使用:', error);
      return this.parseWithFallback(naturalLanguage, userId);
    }
  }

  /**
   * LLM用のプロンプトを作成
   */
  private createParsingPrompt(naturalLanguage: string): string {
    return `以下の自然言語を自動化ルールに変換してください。

入力文: "${naturalLanguage}"

以下のJSON形式で出力してください：

{
  "name": "ルール名",
  "description": "ルールの説明",
  "conditions": [
    {
      "type": "time|temperature|humidity|device_state",
      "operator": "equals|greater_than|less_than|between",
      "value": "値",
      "deviceId": "デバイスID（必要な場合）",
      "tolerance": "許容誤差（必要な場合）"
    }
  ],
  "actions": [
    {
      "type": "device_control|scene_execution|notification",
      "deviceId": "デバイスID",
      "command": "コマンド",
      "parameters": {}
    }
  ],
  "schedule": {
    "type": "daily|weekly|interval|once",
    "time": "HH:MM",
    "days": [1,2,3,4,5],
    "interval": 60
  }
}

利用可能なデバイス:
- ハブミニ (ID: E1750C44657C)
- 温湿度計 (ID: F66854E650BE) - 温度・湿度測定
- エアコン (ID: 02-202212241621-96856893) - エアコンリモート

重要:
- 時刻条件は "time" タイプを使用
- 温度条件は "temperature" タイプ、デバイスIDに温湿度計を指定
- エアコン操作は "device_control" タイプ、command は "turnOn", "turnOff", "setTemperature" など
- 曖昧な時刻表現（「朝」「夕方」など）は具体的な時刻に変換`;
  }

  /**
   * フォールバック解析（パターンマッチング）
   */
  private parseWithFallback(naturalLanguage: string, userId: string): AutomationWorkflow {
    const conditions: RuleCondition[] = [];
    const actions: RuleAction[] = [];
    let schedule: RuleSchedule | undefined;

    // 時刻の解析
    const timePatterns = [
      { pattern: /朝.*?(\d{1,2})時/g, hour: null },
      { pattern: /朝/g, hour: 7 },
      { pattern: /昼/g, hour: 12 },
      { pattern: /夕方/g, hour: 18 },
      { pattern: /夜/g, hour: 20 },
      { pattern: /(\d{1,2})時/g, hour: null }
    ];

    for (const timePattern of timePatterns) {
      const match = timePattern.pattern.exec(naturalLanguage);
      if (match) {
        const hour = timePattern.hour || parseInt(match[1] || '6');
        schedule = {
          type: 'daily',
          time: `${hour.toString().padStart(2, '0')}:00`,
          days: [1, 2, 3, 4, 5, 6, 7] // 毎日
        };
        break;
      }
    }

    // 温度条件の解析
    const tempPatterns = [
      { pattern: /暑かっ?たら/g, condition: { type: 'temperature' as const, operator: 'greater_than' as const, value: 26 } },
      { pattern: /寒かっ?たら/g, condition: { type: 'temperature' as const, operator: 'less_than' as const, value: 20 } },
      { pattern: /温度.*?(\d+)度.*?以上/g, condition: null },
      { pattern: /温度.*?(\d+)度.*?以下/g, condition: null }
    ];

    for (const tempPattern of tempPatterns) {
      const match = tempPattern.pattern.exec(naturalLanguage);
      if (match) {
        let condition = tempPattern.condition;
        if (!condition && match[1]) {
          const temp = parseInt(match[1]);
          condition = {
            type: 'temperature' as const,
            operator: tempPattern.pattern.source.includes('以上') ? 'greater_than' as const : 'less_than' as const,
            value: temp
          };
        }
        if (condition) {
          conditions.push({
            ...condition,
            deviceId: 'F66854E650BE', // 温湿度計
            tolerance: 1
          });
        }
        break;
      }
    }

    // アクション解析
    const actionPatterns = [
      { pattern: /エアコン.*?つけ/g, action: { type: 'device_control' as const, deviceId: '02-202212241621-96856893', command: 'turnOn' } },
      { pattern: /エアコン.*?消/g, action: { type: 'device_control' as const, deviceId: '02-202212241621-96856893', command: 'turnOff' } },
      { pattern: /照明.*?つけ/g, action: { type: 'device_control' as const, command: 'turnOn' } },
      { pattern: /照明.*?消/g, action: { type: 'device_control' as const, command: 'turnOff' } },
      { pattern: /照明.*?暗く/g, action: { type: 'device_control' as const, command: 'turnOff' } }
    ];

    for (const actionPattern of actionPatterns) {
      const match = actionPattern.pattern.exec(naturalLanguage);
      if (match) {
        actions.push(actionPattern.action);
      }
    }

    // ルール名と説明を生成
    const name = this.generateRuleName(naturalLanguage);
    const description = `${naturalLanguage}（自動生成）`;

    const rule: AutomationRule = {
      id: '', // サービス側で生成
      name,
      description,
      isEnabled: true,
      conditions,
      actions,
      schedule,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId,
      executionCount: 0
    };

    return {
      naturalLanguage,
      parsedRule: rule,
      confidence: this.calculateConfidence(conditions, actions, schedule),
      suggestedModifications: this.generateSuggestions(naturalLanguage, conditions, actions)
    };
  }

  /**
   * LLMの応答を検証してワークフローを構築
   */
  private validateAndBuildWorkflow(llmResponse: string, naturalLanguage: string, userId: string): AutomationWorkflow {
    try {
      const parsed = JSON.parse(llmResponse);
      
      const rule: AutomationRule = {
        id: '',
        name: parsed.name || this.generateRuleName(naturalLanguage),
        description: parsed.description || naturalLanguage,
        isEnabled: true,
        conditions: parsed.conditions || [],
        actions: parsed.actions || [],
        schedule: parsed.schedule,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId,
        executionCount: 0
      };

      return {
        naturalLanguage,
        parsedRule: rule,
        confidence: 0.9, // LLM解析の場合は高い信頼度
        suggestedModifications: parsed.suggestedModifications || []
      };
    } catch (error) {
      console.warn('LLM応答の解析に失敗:', error);
      return this.parseWithFallback(naturalLanguage, userId);
    }
  }

  /**
   * ルール名を生成
   */
  private generateRuleName(naturalLanguage: string): string {
    if (naturalLanguage.includes('エアコン') && naturalLanguage.includes('暑')) {
      return '暑い時のエアコン自動ON';
    }
    if (naturalLanguage.includes('エアコン') && naturalLanguage.includes('寒')) {
      return '寒い時のエアコン自動ON';
    }
    if (naturalLanguage.includes('照明') && naturalLanguage.includes('暗')) {
      return '暗い時の照明自動ON';
    }
    
    return `自動化ルール（${new Date().toLocaleDateString()}）`;
  }

  /**
   * 信頼度を計算
   */
  private calculateConfidence(conditions: RuleCondition[], actions: RuleAction[], schedule?: RuleSchedule): number {
    let confidence = 0.3; // ベース信頼度
    
    if (conditions.length > 0) confidence += 0.3;
    if (actions.length > 0) confidence += 0.3;
    if (schedule) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * 改善提案を生成
   */
  private generateSuggestions(naturalLanguage: string, conditions: RuleCondition[], actions: RuleAction[]): string[] {
    const suggestions: string[] = [];
    
    if (conditions.length === 0) {
      suggestions.push('条件が明確でありません。時刻や温度などの条件を追加することをお勧めします。');
    }
    
    if (actions.length === 0) {
      suggestions.push('実行するアクションが見つかりません。具体的な操作を指定してください。');
    }
    
    if (naturalLanguage.includes('エアコン') && !naturalLanguage.includes('温度')) {
      suggestions.push('エアコンの設定温度も指定すると、より効果的です。');
    }
    
    return suggestions;
  }
}
