import { ConditionEvaluatorService } from '../services/condition-evaluator';
import { SwitchBotClient } from '@llm-switchbot/switchbot-adapter';

// SwitchBotClientをモック
jest.mock('@llm-switchbot/switchbot-adapter');
const MockedSwitchBotClient = SwitchBotClient as jest.MockedClass<typeof SwitchBotClient>;

describe('ConditionEvaluatorService', () => {
  let conditionEvaluator: ConditionEvaluatorService;
  let mockSwitchBotClient: jest.Mocked<SwitchBotClient>;

  beforeEach(() => {
    // SwitchBotClientのモックインスタンスを作成
    mockSwitchBotClient = new MockedSwitchBotClient('test-token', 'test-secret') as jest.Mocked<SwitchBotClient>;
    
    // メソッドをモック化
    mockSwitchBotClient.getDevices = jest.fn();
    mockSwitchBotClient.getDeviceStatus = jest.fn();
    mockSwitchBotClient.sendCommand = jest.fn();
    mockSwitchBotClient.getScenes = jest.fn();
    mockSwitchBotClient.executeScene = jest.fn();

    conditionEvaluator = new ConditionEvaluatorService(mockSwitchBotClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('evaluateConditions', () => {
    it('should evaluate time conditions correctly', async () => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const conditions = [
        {
          type: 'time' as const,
          operator: 'equals' as const,
          value: currentTime,
          tolerance: 5
        }
      ];

      const result = await conditionEvaluator.evaluateConditions(conditions);

      expect(result.allMet).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].matched).toBe(true);
      expect(result.results[0].actualValue).toBe(currentTime);
    });

    it('should evaluate temperature conditions', async () => {
      // Mock SwitchBot API response
      mockSwitchBotClient.getDeviceStatus.mockResolvedValue({
        statusCode: 100,
        message: 'success',
        body: {
          temperature: 28.5,
          humidity: 65,
          battery: 100
        }
      });

      const conditions = [
        {
          type: 'temperature' as const,
          operator: 'greater_than' as const,
          value: 26,
          deviceId: 'F66854E650BE'
        }
      ];

      const result = await conditionEvaluator.evaluateConditions(conditions);

      expect(result.allMet).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].matched).toBe(true);
      expect(result.results[0].actualValue).toBe(28.5);
    });

    it('should handle multiple conditions (AND logic)', async () => {
      // 温度条件のモックを設定
      mockSwitchBotClient.getDeviceStatus.mockResolvedValue({
        statusCode: 100,
        message: 'success',
        body: {
          temperature: 25.0,
          humidity: 65,
          battery: 100
        }
      });

      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      const conditions = [
        {
          type: 'time' as const,
          operator: 'equals' as const,
          value: currentTime,
          tolerance: 5
        },
        {
          type: 'temperature' as const,
          operator: 'greater_than' as const,
          value: 26,
          deviceId: 'F66854E650BE'
        }
      ];

      const result = await conditionEvaluator.evaluateConditions(conditions);

      expect(result.allMet).toBe(false); // 温度条件が満たされない
      expect(result.results).toHaveLength(2);
      expect(result.results[0].matched).toBe(true);  // 時刻は一致
      expect(result.results[1].matched).toBe(false); // 温度は一致しない (25 <= 26)
    });

    it('should handle API errors gracefully', async () => {
      mockSwitchBotClient.getDeviceStatus.mockRejectedValue(new Error('API Error'));

      const conditions = [
        {
          type: 'temperature' as const,
          operator: 'greater_than' as const,
          value: 26,
          deviceId: 'F66854E650BE'
        }
      ];

      const result = await conditionEvaluator.evaluateConditions(conditions);

      expect(result.allMet).toBe(false);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].matched).toBe(false);
      expect(result.results[0].actualValue).toBeNull();
    });
  });

  describe('isTimeInSchedule', () => {
    it('should return true for daily schedule matching current time', () => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const schedule = {
        time: currentTime,
        days: [0, 1, 2, 3, 4, 5, 6] // 毎日
      };

      const result = conditionEvaluator.isTimeInSchedule(schedule);
      expect(result).toBe(true);
    });

    it('should return false for different time', () => {
      const schedule = {
        time: '23:59',
        days: [0, 1, 2, 3, 4, 5, 6]
      };

      const result = conditionEvaluator.isTimeInSchedule(schedule);
      expect(result).toBe(false);
    });

    it('should handle weekly schedule', () => {
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const schedule = {
        time: currentTime,
        days: [currentDay] // 今日のみ
      };

      const result = conditionEvaluator.isTimeInSchedule(schedule);
      expect(result).toBe(true);
    });
  });
});
