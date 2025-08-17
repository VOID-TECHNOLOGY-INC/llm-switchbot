import { RuleCondition, RuleConditionResult } from '@llm-switchbot/shared';
import { SwitchBotClient } from '@llm-switchbot/switchbot-adapter';

/**
 * 条件評価エンジン
 */
export class ConditionEvaluatorService {
  constructor(private switchBotClient: SwitchBotClient) {}

  /**
   * 条件リストを評価
   */
  async evaluateConditions(conditions: RuleCondition[]): Promise<{ allMet: boolean; results: RuleConditionResult[] }> {
    const results: RuleConditionResult[] = [];
    let allMet = true;

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      const result = await this.evaluateCondition(condition, i);
      results.push(result);
      
      if (!result.matched) {
        allMet = false;
      }
    }

    return { allMet, results };
  }

  /**
   * 個別条件を評価
   */
  async evaluateCondition(condition: RuleCondition, index: number): Promise<RuleConditionResult> {
    const evaluatedAt = new Date().toISOString();
    
    try {
      switch (condition.type) {
        case 'time':
          return await this.evaluateTimeCondition(condition, index, evaluatedAt);
        case 'temperature':
          return await this.evaluateTemperatureCondition(condition, index, evaluatedAt);
        case 'humidity':
          return await this.evaluateHumidityCondition(condition, index, evaluatedAt);
        case 'device_state':
          return await this.evaluateDeviceStateCondition(condition, index, evaluatedAt);
        default:
          return {
            conditionIndex: index,
            matched: false,
            actualValue: null,
            expectedValue: condition.value,
            evaluatedAt,
          };
      }
    } catch (error) {
      console.error('条件評価エラー:', error);
      return {
        conditionIndex: index,
        matched: false,
        actualValue: null,
        expectedValue: condition.value,
        evaluatedAt,
      };
    }
  }

  /**
   * 時刻条件の評価
   */
  private async evaluateTimeCondition(condition: RuleCondition, index: number, evaluatedAt: string): Promise<RuleConditionResult> {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    let matched = false;
    const expectedValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        // 時刻の完全一致（±2分の許容範囲）
        const targetTime = this.parseTime(expectedValue);
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const targetMinutes = targetTime.hours * 60 + targetTime.minutes;
        const tolerance = condition.tolerance || 2; // デフォルト2分
        matched = Math.abs(currentMinutes - targetMinutes) <= tolerance;
        break;
      case 'greater_than':
        matched = currentTime > expectedValue;
        break;
      case 'less_than':
        matched = currentTime < expectedValue;
        break;
      case 'between':
        // expectedValue should be ["08:00", "18:00"] format
        if (Array.isArray(expectedValue) && expectedValue.length === 2) {
          matched = currentTime >= expectedValue[0] && currentTime <= expectedValue[1];
        }
        break;
    }

    return {
      conditionIndex: index,
      matched,
      actualValue: currentTime,
      expectedValue,
      evaluatedAt,
    };
  }

  /**
   * 温度条件の評価
   */
  private async evaluateTemperatureCondition(condition: RuleCondition, index: number, evaluatedAt: string): Promise<RuleConditionResult> {
    if (!condition.deviceId) {
      throw new Error('温度条件にはデバイスIDが必要です');
    }

    try {
      const deviceStatus = await this.switchBotClient.getDeviceStatus(condition.deviceId);
      const currentTemp = deviceStatus.body?.temperature;
      
      if (currentTemp === undefined || currentTemp === null) {
        throw new Error('温度データが取得できません');
      }

      const expectedTemp = parseFloat(condition.value);
      const tolerance = condition.tolerance || 0.5; // デフォルト0.5度の許容誤差
      let matched = false;

      switch (condition.operator) {
        case 'equals':
          matched = Math.abs(currentTemp - expectedTemp) <= tolerance;
          break;
        case 'greater_than':
          matched = currentTemp > expectedTemp;
          break;
        case 'less_than':
          matched = currentTemp < expectedTemp;
          break;
        case 'between':
          if (Array.isArray(condition.value) && condition.value.length === 2) {
            matched = currentTemp >= condition.value[0] && currentTemp <= condition.value[1];
          }
          break;
      }

      return {
        conditionIndex: index,
        matched,
        actualValue: currentTemp,
        expectedValue: condition.value,
        evaluatedAt,
      };
    } catch (error) {
      console.error('温度条件評価エラー:', error);
      return {
        conditionIndex: index,
        matched: false,
        actualValue: null,
        expectedValue: condition.value,
        evaluatedAt,
      };
    }
  }

  /**
   * 湿度条件の評価
   */
  private async evaluateHumidityCondition(condition: RuleCondition, index: number, evaluatedAt: string): Promise<RuleConditionResult> {
    if (!condition.deviceId) {
      throw new Error('湿度条件にはデバイスIDが必要です');
    }

    try {
      const deviceStatus = await this.switchBotClient.getDeviceStatus(condition.deviceId);
      const currentHumidity = deviceStatus.body?.humidity;
      
      if (currentHumidity === undefined || currentHumidity === null) {
        throw new Error('湿度データが取得できません');
      }

      const expectedHumidity = parseFloat(condition.value);
      const tolerance = condition.tolerance || 2; // デフォルト2%の許容誤差
      let matched = false;

      switch (condition.operator) {
        case 'equals':
          matched = Math.abs(currentHumidity - expectedHumidity) <= tolerance;
          break;
        case 'greater_than':
          matched = currentHumidity > expectedHumidity;
          break;
        case 'less_than':
          matched = currentHumidity < expectedHumidity;
          break;
        case 'between':
          if (Array.isArray(condition.value) && condition.value.length === 2) {
            matched = currentHumidity >= condition.value[0] && currentHumidity <= condition.value[1];
          }
          break;
      }

      return {
        conditionIndex: index,
        matched,
        actualValue: currentHumidity,
        expectedValue: condition.value,
        evaluatedAt,
      };
    } catch (error) {
      console.error('湿度条件評価エラー:', error);
      return {
        conditionIndex: index,
        matched: false,
        actualValue: null,
        expectedValue: condition.value,
        evaluatedAt,
      };
    }
  }

  /**
   * デバイス状態条件の評価
   */
  private async evaluateDeviceStateCondition(condition: RuleCondition, index: number, evaluatedAt: string): Promise<RuleConditionResult> {
    if (!condition.deviceId) {
      throw new Error('デバイス状態条件にはデバイスIDが必要です');
    }

    try {
      const deviceStatus = await this.switchBotClient.getDeviceStatus(condition.deviceId);
      const actualValue = deviceStatus.body;
      let matched = false;

      switch (condition.operator) {
        case 'equals':
          matched = JSON.stringify(actualValue) === JSON.stringify(condition.value);
          break;
        case 'contains':
          if (typeof condition.value === 'string' && typeof actualValue === 'object') {
            matched = JSON.stringify(actualValue).includes(condition.value);
          }
          break;
        // その他の演算子は必要に応じて実装
      }

      return {
        conditionIndex: index,
        matched,
        actualValue,
        expectedValue: condition.value,
        evaluatedAt,
      };
    } catch (error) {
      console.error('デバイス状態条件評価エラー:', error);
      return {
        conditionIndex: index,
        matched: false,
        actualValue: null,
        expectedValue: condition.value,
        evaluatedAt,
      };
    }
  }

  /**
   * 時刻文字列をパース
   */
  private parseTime(timeString: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeString.split(':').map(s => parseInt(s, 10));
    return { hours: hours || 0, minutes: minutes || 0 };
  }

  /**
   * 現在時刻が条件の時間範囲内かチェック
   */
  isTimeInSchedule(schedule?: { time?: string; days?: number[] }): boolean {
    if (!schedule) return true;

    const now = new Date();
    
    // 曜日チェック（0=日曜日, 1=月曜日, ...）
    if (schedule.days && schedule.days.length > 0) {
      if (!schedule.days.includes(now.getDay())) {
        return false;
      }
    }

    // 時刻チェック
    if (schedule.time) {
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      // 時刻が一致するかチェック（±2分の許容範囲）
      const targetTime = this.parseTime(schedule.time);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const targetMinutes = targetTime.hours * 60 + targetTime.minutes;
      
      return Math.abs(currentMinutes - targetMinutes) <= 2;
    }

    return true;
  }
}
