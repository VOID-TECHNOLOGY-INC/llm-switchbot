import { SwitchBotClient } from '@llm-switchbot/switchbot-adapter';
import {
  OperationRecord,
  OperationPattern,
  SequentialPattern,
  TimeBasedPattern,
  SceneCandidate,
  LearnedScene,
  SceneSuggestion,
  SceneLearningContext,
  AutomationAction
} from '@llm-switchbot/shared';

export class SceneLearningService {
  private switchBotClient: SwitchBotClient;
  private operationHistory: OperationRecord[] = [];
  private patterns: OperationPattern[] = [];
  private learnedScenes: LearnedScene[] = [];

  constructor(switchBotClient: SwitchBotClient) {
    this.switchBotClient = switchBotClient;
  }

  /**
   * 操作を記録
   */
  async recordOperation(operation: OperationRecord): Promise<void> {
    this.operationHistory.push(operation);
    await this.updatePatterns(operation);
  }

  /**
   * 操作パターンを取得
   */
  async getOperationPatterns(): Promise<OperationPattern[]> {
    return this.patterns;
  }

  /**
   * 順次パターンを検出
   */
  async detectPatterns(): Promise<SequentialPattern[]> {
    const patterns: SequentialPattern[] = [];
    const timeWindow = 5; // 5分以内の操作をグループ化

    // 操作履歴を時系列でソート
    const sortedHistory = [...this.operationHistory].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // 連続操作パターンを検出
    for (let i = 0; i < sortedHistory.length - 1; i++) {
      const current = sortedHistory[i];
      const next = sortedHistory[i + 1];
      
      const timeDiff = (new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime()) / (1000 * 60);
      
      if (timeDiff <= timeWindow) {
        const pattern: SequentialPattern = {
          operations: [current, next],
          frequency: 1,
          timeWindow,
          confidence: 0.7
        };
        
        // 既存パターンとの重複チェック
        const existingPattern = patterns.find(p => 
          p.operations.length === 2 &&
          p.operations[0].deviceId === current.deviceId &&
          p.operations[0].command === current.command &&
          p.operations[1].deviceId === next.deviceId &&
          p.operations[1].command === next.command
        );

        if (existingPattern) {
          existingPattern.frequency++;
          existingPattern.confidence = Math.min(0.95, existingPattern.confidence + 0.1);
        } else {
          patterns.push(pattern);
        }
      }
    }

    return patterns.filter(p => p.frequency >= 2); // 2回以上実行されたパターンのみ
  }

  /**
   * 時間ベースパターンを検出
   */
  async detectTimeBasedPatterns(): Promise<TimeBasedPattern[]> {
    const patterns: TimeBasedPattern[] = [];
    const timeRanges = this.groupOperationsByTime();

    for (const [timeRange, operations] of Object.entries(timeRanges)) {
      if (operations.length >= 3) { // 3回以上実行された時間帯のみ
        const pattern: TimeBasedPattern = {
          timeRange: this.parseTimeRange(timeRange),
          operations,
          frequency: operations.length,
          confidence: Math.min(0.9, operations.length * 0.1)
        };
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * シーン候補を生成
   */
  async generateSceneCandidates(): Promise<SceneCandidate[]> {
    const candidates: SceneCandidate[] = [];

    // 頻出操作からシーン候補を生成
    const frequentOperations = this.patterns.filter(p => p.frequency >= 5);
    for (const pattern of frequentOperations) {
      const candidate: SceneCandidate = {
        name: this.generateSceneName(pattern),
        operations: [{
          deviceId: pattern.deviceId,
          command: pattern.command,
          parameters: pattern.parameters
        }],
        confidence: Math.min(0.95, pattern.frequency * 0.1),
        frequency: pattern.frequency,
        patternType: 'frequent',
        reasoning: `${pattern.frequency}回実行された頻出操作`
      };
      candidates.push(candidate);
    }

    // 順次パターンからシーン候補を生成
    const sequentialPatterns = await this.detectPatterns();
    for (const pattern of sequentialPatterns) {
      const candidate: SceneCandidate = {
        name: this.generateSceneNameFromPattern(pattern),
        operations: pattern.operations.map(op => ({
          deviceId: op.deviceId,
          command: op.command,
          parameters: op.parameters
        })),
        confidence: pattern.confidence,
        frequency: pattern.frequency,
        patternType: 'sequential',
        reasoning: `${pattern.frequency}回実行された順次操作パターン`
      };
      candidates.push(candidate);
    }

    // 時間ベースパターンからシーン候補を生成
    const timeBasedPatterns = await this.detectTimeBasedPatterns();
    for (const pattern of timeBasedPatterns) {
      const candidate: SceneCandidate = {
        name: this.generateSceneNameFromTimePattern(pattern),
        operations: pattern.operations.map(op => ({
          deviceId: op.deviceId,
          command: op.command,
          parameters: op.parameters
        })),
        confidence: pattern.confidence,
        frequency: pattern.frequency,
        patternType: 'time_based',
        reasoning: `${pattern.timeRange.start}-${pattern.timeRange.end}の時間帯に${pattern.frequency}回実行`
      };
      candidates.push(candidate);
    }

    return candidates.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 候補からシーンを作成
   */
  async createSceneFromCandidate(candidate: SceneCandidate): Promise<LearnedScene> {
    if (candidate.confidence < 0.5) {
      throw new Error('信頼度が低すぎます');
    }

    const scene: LearnedScene = {
      id: `scene_${Date.now()}`,
      name: candidate.name,
      operations: candidate.operations,
      confidence: candidate.confidence,
      isAutoGenerated: true,
      createdAt: new Date().toISOString(),
      usageCount: 0
    };

    this.learnedScenes.push(scene);
    return scene;
  }

  /**
   * コンテキストに基づくシーン提案を取得
   */
  async getSceneSuggestions(context: SceneLearningContext): Promise<SceneSuggestion[]> {
    const suggestions: SceneSuggestion[] = [];

    // 学習済みシーンから提案
    for (const scene of this.learnedScenes) {
      const relevance = this.calculateSceneRelevance(scene, context);
      if (relevance > 0.6) {
        suggestions.push({
          type: 'learned_scene',
          sceneId: scene.id,
          name: scene.name,
          description: `${scene.name}の実行を提案します`,
          confidence: scene.confidence * relevance,
          actions: scene.operations,
          reasoning: `過去の使用パターンに基づく提案（信頼度: ${(scene.confidence * 100).toFixed(1)}%）`
        });
      }
    }

    // 現在のコンテキストに基づく推奨シーン
    const recommendedScene = this.generateRecommendedScene(context);
    if (recommendedScene) {
      suggestions.push(recommendedScene);
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * パターンを更新
   */
  private async updatePatterns(operation: OperationRecord): Promise<void> {
    const existingPattern = this.patterns.find(p => 
      p.deviceId === operation.deviceId &&
      p.command === operation.command &&
      JSON.stringify(p.parameters) === JSON.stringify(operation.parameters)
    );

    if (existingPattern) {
      existingPattern.frequency++;
      existingPattern.lastUsed = operation.timestamp;
    } else {
      this.patterns.push({
        deviceId: operation.deviceId,
        command: operation.command,
        parameters: operation.parameters,
        frequency: 1,
        lastUsed: operation.timestamp
      });
    }
  }

  /**
   * 操作を時間帯でグループ化
   */
  private groupOperationsByTime(): Record<string, OperationRecord[]> {
    const groups: Record<string, OperationRecord[]> = {};

    for (const operation of this.operationHistory) {
      const hour = new Date(operation.timestamp).getHours();
      const timeRange = this.getTimeRange(hour);
      
      if (!groups[timeRange]) {
        groups[timeRange] = [];
      }
      groups[timeRange].push(operation);
    }

    return groups;
  }

  /**
   * 時間帯を取得
   */
  private getTimeRange(hour: number): string {
    if (hour >= 6 && hour < 12) return '06:00-12:00';
    if (hour >= 12 && hour < 18) return '12:00-18:00';
    if (hour >= 18 && hour < 24) return '18:00-24:00';
    return '00:00-06:00';
  }

  /**
   * 時間範囲をパース
   */
  private parseTimeRange(timeRange: string): { start: string; end: string; frequency: number } {
    const [start, end] = timeRange.split('-');
    return { start, end, frequency: 1 };
  }

  /**
   * シーン名を生成
   */
  private generateSceneName(pattern: OperationPattern): string {
    const deviceNames: Record<string, string> = {
      'light_entrance': '玄関照明',
      'light_living': 'リビング照明',
      'aircon_living': 'リビングエアコン',
      'lock_entrance': '玄関ロック'
    };

    const deviceName = deviceNames[pattern.deviceId] || pattern.deviceId;
    const actionNames: Record<string, string> = {
      'turnOn': '点灯',
      'turnOff': '消灯',
      'lock': '施錠',
      'unlock': '解錠'
    };

    const actionName = actionNames[pattern.command] || pattern.command;
    return `${deviceName}${actionName}`;
  }

  /**
   * パターンからシーン名を生成
   */
  private generateSceneNameFromPattern(pattern: SequentialPattern): string {
    const deviceNames = pattern.operations.map(op => {
      const deviceNames: Record<string, string> = {
        'light_entrance': '玄関照明',
        'light_living': 'リビング照明',
        'aircon_living': 'エアコン'
      };
      return deviceNames[op.deviceId] || op.deviceId;
    });

    if (deviceNames.includes('玄関照明') && deviceNames.includes('リビング照明')) {
      return '帰宅シーン';
    }

    return `${deviceNames.join('・')}操作`;
  }

  /**
   * 時間パターンからシーン名を生成
   */
  private generateSceneNameFromTimePattern(pattern: TimeBasedPattern): string {
    const hour = parseInt(pattern.timeRange.start.split(':')[0]);
    
    if (hour >= 18 && hour <= 21) {
      return '夕方シーン';
    } else if (hour >= 22 || hour <= 6) {
      return '夜間シーン';
    } else if (hour >= 6 && hour <= 12) {
      return '朝シーン';
    } else {
      return '日中シーン';
    }
  }

  /**
   * シーンの関連性を計算
   */
  private calculateSceneRelevance(scene: LearnedScene, context: SceneLearningContext): number {
    let relevance = 0;

    // 時間帯の関連性
    const currentHour = parseInt(context.time.split(':')[0]);
    const sceneHour = scene.createdAt ? new Date(scene.createdAt).getHours() : 12;
    const hourDiff = Math.abs(currentHour - sceneHour);
    if (hourDiff <= 2) relevance += 0.3;
    else if (hourDiff <= 4) relevance += 0.1;

    // デバイスの関連性
    const sceneDevices = scene.operations.map(op => op.deviceId);
    const availableDevices = context.availableDevices;
    const deviceOverlap = sceneDevices.filter(device => availableDevices.includes(device)).length;
    relevance += (deviceOverlap / sceneDevices.length) * 0.4;

    // イベントの関連性
    if (context.recentEvents.includes('door_unlock') && scene.name.includes('帰宅')) {
      relevance += 0.3;
    }

    return Math.min(1, relevance);
  }

  /**
   * 推奨シーンを生成
   */
  private generateRecommendedScene(context: SceneLearningContext): SceneSuggestion | null {
    const time = context.time;
    const hour = parseInt(time.split(':')[0]);

    if (hour >= 18 && hour <= 21 && context.recentEvents.includes('door_unlock')) {
      return {
        type: 'recommended_scene',
        name: '推奨帰宅シーン',
        description: '帰宅時の推奨操作',
        confidence: 0.8,
        actions: [
          { deviceId: 'light_entrance', command: 'turnOn', parameters: {} },
          { deviceId: 'light_living', command: 'turnOn', parameters: {} }
        ],
        reasoning: '夕方の帰宅時に推奨される操作パターン'
      };
    }

    return null;
  }
}
