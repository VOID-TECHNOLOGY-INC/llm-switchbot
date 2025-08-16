import { SwitchBotClient } from '@llm-switchbot/switchbot-adapter';
import {
  AutomationEvent,
  AutomationProposal,
  AutomationSuggestion,
  AutomationContext,
  AutomationAction,
  ProposalValidation
} from '@llm-switchbot/shared';

export class AutomationProposalService {
  private switchBotClient: SwitchBotClient;
  private ruleEngine: AutomationRuleEngine;

  constructor(switchBotClient: SwitchBotClient) {
    this.switchBotClient = switchBotClient;
    this.ruleEngine = new AutomationRuleEngine();
  }

  /**
   * イベントを分析して自動化提案を生成
   */
  async analyzeEvent(event: AutomationEvent): Promise<AutomationProposal> {
    const context = this.buildContext(event);
    const suggestions: AutomationSuggestion[] = [];

    // ルールベースの分析
    const ruleSuggestions = this.ruleEngine.analyzeEvent(event, context);
    suggestions.push(...ruleSuggestions);

    // LLMベースの分析（将来的に実装）
    // const llmSuggestions = await this.analyzeWithLLM(event, context);
    // suggestions.push(...llmSuggestions);

    // 信頼度の計算
    const confidence = this.calculateConfidence(suggestions);

    return {
      suggestions,
      confidence,
      context
    };
  }

  /**
   * コンテキストから提案を生成
   */
  async generateProposal(context: AutomationContext): Promise<AutomationSuggestion> {
    const time = context.time;
    const location = context.location;
    const recentEvents = context.recentEvents;

    // 時間帯と場所に基づく提案
    if (this.isEveningTime(time) && location === 'entrance' && recentEvents.includes('door_unlock')) {
      return {
        type: 'lighting',
        description: '帰宅時の照明点灯を提案します',
        confidence: 0.85,
        actions: [
          {
            deviceId: this.findDeviceByType(context.availableDevices, 'light'),
            command: 'turnOn',
            parameters: {}
          }
        ],
        reasoning: '夕方の帰宅時に玄関の照明を点灯することで、安全で快適な入室をサポートします'
      };
    }

    if (this.isHighTemperature(context.sensorData) && location === 'living_room') {
      return {
        type: 'climate',
        description: '室温が高いためエアコンの運転を提案します',
        confidence: 0.75,
        actions: [
          {
            deviceId: this.findDeviceByType(context.availableDevices, 'aircon'),
            command: 'turnOn',
            parameters: { temperature: 25 }
          }
        ],
        reasoning: '室温が28度を超えているため、快適な温度に調整します'
      };
    }

    // デフォルトの提案
    return {
      type: 'comfort',
      description: '現在の状況に基づく自動化提案',
      confidence: 0.5,
      actions: [],
      reasoning: '現在の状況では特別な自動化は必要ありません'
    };
  }

  /**
   * 提案の実行可能性を検証
   */
  async validateProposal(proposal: AutomationSuggestion): Promise<ProposalValidation> {
    const issues: string[] = [];

    for (const action of proposal.actions) {
      try {
        const deviceStatus = await this.switchBotClient.getDeviceStatus(action.deviceId);
        
        if (!deviceStatus.online) {
          issues.push(`デバイス ${action.deviceId} がオフラインです`);
        }

        // デバイス固有の検証
        if (action.command === 'turnOn' && deviceStatus.power === 'on') {
          issues.push(`デバイス ${action.deviceId} は既にオンになっています`);
        }
      } catch (error) {
        issues.push(`デバイス ${action.deviceId} の状態確認に失敗しました`);
      }
    }

    const isValid = issues.length === 0;
    const reason = isValid ? '実行可能' : `問題があります: ${issues.join(', ')}`;

    return {
      isValid,
      reason,
      issues: issues.length > 0 ? issues : undefined
    };
  }

  /**
   * コンテキストを構築
   */
  private buildContext(event: AutomationEvent): AutomationContext {
    const time = event.context?.time || this.getCurrentTime();
    const location = event.context?.location || 'unknown';

    return {
      time,
      location,
      recentEvents: [event.eventType],
      availableDevices: [], // 実際の実装ではデバイス一覧を取得
      sensorData: event.state
    };
  }

  /**
   * 信頼度を計算
   */
  private calculateConfidence(suggestions: AutomationSuggestion[]): number {
    if (suggestions.length === 0) return 0;
    
    const totalConfidence = suggestions.reduce((sum, suggestion) => sum + suggestion.confidence, 0);
    return totalConfidence / suggestions.length;
  }

  /**
   * 夕方時間帯かどうかを判定
   */
  private isEveningTime(time: string): boolean {
    const hour = parseInt(time.split(':')[0]);
    return hour >= 17 && hour <= 21;
  }

  /**
   * 高温かどうかを判定
   */
  private isHighTemperature(sensorData?: Record<string, any>): boolean {
    if (!sensorData?.temperature) return false;
    return sensorData.temperature > 28;
  }

  /**
   * デバイスタイプに基づいてデバイスIDを検索
   */
  private findDeviceByType(availableDevices: string[], type: string): string {
    // 実際の実装ではデバイス一覧から適切なデバイスを検索
    return availableDevices.find(device => device.includes(type)) || availableDevices[0] || '';
  }

  /**
   * 現在時刻を取得
   */
  private getCurrentTime(): string {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }
}

/**
 * 自動化ルールエンジン
 */
class AutomationRuleEngine {
  private rules: AutomationRule[] = [
    // 帰宅時の照明ルール
    {
      name: '帰宅照明',
      conditions: {
        eventType: 'deviceStateChange',
        deviceType: 'Lock',
        state: 'unlocked',
        timeRange: { start: '17:00', end: '21:00' }
      },
      suggestion: {
        type: 'lighting',
        description: '帰宅時の照明点灯',
        confidence: 0.9,
        actions: [
          { deviceId: 'light_entrance', command: 'turnOn', parameters: {} }
        ]
      }
    },
    // 高温時のエアコンルール
    {
      name: '高温エアコン',
      conditions: {
        eventType: 'sensorData',
        deviceType: 'Meter',
        sensorThreshold: { temperature: 28 }
      },
      suggestion: {
        type: 'climate',
        description: '室温調整のためのエアコン運転',
        confidence: 0.8,
        actions: [
          { deviceId: 'aircon_living', command: 'turnOn', parameters: { temperature: 25 } }
        ]
      }
    }
  ];

  /**
   * イベントを分析してルールベースの提案を生成
   */
  analyzeEvent(event: AutomationEvent, context: AutomationContext): AutomationSuggestion[] {
    const suggestions: AutomationSuggestion[] = [];

    for (const rule of this.rules) {
      if (this.matchesRule(event, context, rule)) {
        suggestions.push({
          ...rule.suggestion,
          reasoning: `ルール「${rule.name}」に基づく提案`
        });
      }
    }

    return suggestions;
  }

  /**
   * イベントがルールにマッチするかチェック
   */
  private matchesRule(event: AutomationEvent, context: AutomationContext, rule: AutomationRule): boolean {
    const conditions = rule.conditions;

    // イベントタイプのチェック
    if (conditions.eventType && event.eventType !== conditions.eventType) {
      return false;
    }

    // デバイスタイプのチェック
    if (conditions.deviceType && event.deviceType !== conditions.deviceType) {
      return false;
    }

    // 状態のチェック
    if (conditions.state && event.state !== conditions.state) {
      return false;
    }

    // 時間範囲のチェック
    if (conditions.timeRange) {
      const currentTime = context.time;
      if (!this.isTimeInRange(currentTime, conditions.timeRange)) {
        return false;
      }
    }

    // センサー閾値のチェック
    if (conditions.sensorThreshold) {
      const sensorData = event.state;
      if (!this.checkSensorThreshold(sensorData, conditions.sensorThreshold)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 時刻が範囲内かチェック
   */
  private isTimeInRange(time: string, range: { start: string; end: string }): boolean {
    const current = this.timeToMinutes(time);
    const start = this.timeToMinutes(range.start);
    const end = this.timeToMinutes(range.end);

    if (start <= end) {
      return current >= start && current <= end;
    } else {
      // 日をまたぐ場合（例：23:00-06:00）
      return current >= start || current <= end;
    }
  }

  /**
   * 時刻を分に変換
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * センサー閾値をチェック
   */
  private checkSensorThreshold(sensorData: any, threshold: Record<string, number>): boolean {
    for (const [key, value] of Object.entries(threshold)) {
      if (sensorData[key] === undefined || sensorData[key] <= value) {
        return false;
      }
    }
    return true;
  }
}

/**
 * 自動化ルールの型定義
 */
interface AutomationRule {
  name: string;
  conditions: {
    eventType?: string;
    deviceType?: string;
    state?: any;
    timeRange?: { start: string; end: string };
    sensorThreshold?: Record<string, number>;
  };
  suggestion: Omit<AutomationSuggestion, 'reasoning'>;
}
