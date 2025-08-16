import { SceneLearningService } from '../services/scene-learning';
import { SwitchBotClient } from '@llm-switchbot/switchbot-adapter';
import { SceneCandidate } from '@llm-switchbot/shared';

// Mock SwitchBotClient
jest.mock('@llm-switchbot/switchbot-adapter');

describe('SceneLearningService', () => {
  let sceneLearningService: SceneLearningService;
  let mockSwitchBotClient: jest.Mocked<SwitchBotClient>;

  beforeEach(() => {
    mockSwitchBotClient = {
      getDevices: jest.fn(),
      getDeviceStatus: jest.fn(),
      sendCommand: jest.fn(),
      getScenes: jest.fn(),
      executeScene: jest.fn(),
      getStats: jest.fn(),
      clearCache: jest.fn(),
    } as any;

    sceneLearningService = new SceneLearningService(mockSwitchBotClient);
  });

  describe('recordOperation', () => {
    it('should record single operation', async () => {
      const operation = {
        deviceId: 'light_entrance',
        command: 'turnOn',
        parameters: {},
        timestamp: new Date().toISOString(),
        userId: 'user-001'
      };

      await sceneLearningService.recordOperation(operation);

      const patterns = await sceneLearningService.getOperationPatterns();
      expect(patterns).toHaveLength(1);
      expect(patterns[0].deviceId).toBe('light_entrance');
      expect(patterns[0].frequency).toBe(1);
    });

    it('should increment frequency for repeated operations', async () => {
      const operation = {
        deviceId: 'light_entrance',
        command: 'turnOn',
        parameters: {},
        timestamp: new Date().toISOString(),
        userId: 'user-001'
      };

      // Record same operation multiple times
      await sceneLearningService.recordOperation(operation);
      await sceneLearningService.recordOperation(operation);
      await sceneLearningService.recordOperation(operation);

      const patterns = await sceneLearningService.getOperationPatterns();
      expect(patterns).toHaveLength(1);
      expect(patterns[0].frequency).toBe(3);
    });
  });

  describe('detectPatterns', () => {
    it('should detect sequential operation patterns', async () => {
      const operations = [
        {
          deviceId: 'light_entrance',
          command: 'turnOn',
          parameters: {},
          timestamp: new Date('2025-01-01T18:00:00Z').toISOString(),
          userId: 'user-001'
        },
        {
          deviceId: 'light_living',
          command: 'turnOn',
          parameters: {},
          timestamp: new Date('2025-01-01T18:01:00Z').toISOString(),
          userId: 'user-001'
        },
        {
          deviceId: 'aircon_living',
          command: 'turnOn',
          parameters: { temperature: 25 },
          timestamp: new Date('2025-01-01T18:02:00Z').toISOString(),
          userId: 'user-001'
        }
      ];

      // Record operations multiple times to meet frequency requirement
      for (let i = 0; i < 3; i++) {
        for (const op of operations) {
          const timestamp = new Date(`2025-01-0${i + 1}T18:00:00Z`);
          timestamp.setMinutes(timestamp.getMinutes() + i);
          await sceneLearningService.recordOperation({
            ...op,
            timestamp: timestamp.toISOString()
          });
        }
      }

      const patterns = await sceneLearningService.detectPatterns();
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].operations).toHaveLength(2);
      expect(patterns[0].timeWindow).toBeDefined();
    });

    it('should detect time-based patterns', async () => {
      const eveningOperations = [
        {
          deviceId: 'light_entrance',
          command: 'turnOn',
          parameters: {},
          timestamp: new Date('2025-01-01T18:00:00Z').toISOString(),
          userId: 'user-001'
        },
        {
          deviceId: 'light_living',
          command: 'turnOn',
          parameters: {},
          timestamp: new Date('2025-01-01T18:05:00Z').toISOString(),
          userId: 'user-001'
        }
      ];

      // Record evening operations multiple days
      for (let i = 0; i < 5; i++) {
        for (const op of eveningOperations) {
          const timestamp = new Date(`2025-01-0${i + 1}T18:00:00Z`);
          timestamp.setMinutes(timestamp.getMinutes() + i);
          await sceneLearningService.recordOperation({
            ...op,
            timestamp: timestamp.toISOString()
          });
        }
      }

      const patterns = await sceneLearningService.detectTimeBasedPatterns();
      expect(patterns).toHaveLength(1);
      expect(patterns[0].timeRange.start).toBe('18:00');
      expect(patterns[0].timeRange.end).toBe('24:00');
      expect(patterns[0].frequency).toBeGreaterThanOrEqual(5);
    });
  });

  describe('generateSceneCandidates', () => {
    it('should generate scene candidates from frequent patterns', async () => {
      // Record frequent operations
      const frequentOperation = {
        deviceId: 'light_entrance',
        command: 'turnOn',
        parameters: {},
        timestamp: new Date().toISOString(),
        userId: 'user-001'
      };

      for (let i = 0; i < 10; i++) {
        await sceneLearningService.recordOperation(frequentOperation);
      }

      const candidates = await sceneLearningService.generateSceneCandidates();

      expect(candidates.length).toBeGreaterThan(0);
      const frequentCandidate = candidates.find(c => c.patternType === 'frequent');
      expect(frequentCandidate).toBeDefined();
      expect(frequentCandidate?.name).toContain('玄関照明');
      expect(frequentCandidate?.operations).toHaveLength(1);
      expect(candidates[0].confidence).toBeGreaterThan(0.8);
    });

    it('should generate multi-device scene candidates', async () => {
      const multiDeviceOperations = [
        {
          deviceId: 'light_entrance',
          command: 'turnOn',
          parameters: {},
          timestamp: new Date('2025-01-01T18:00:00Z').toISOString(),
          userId: 'user-001'
        },
        {
          deviceId: 'light_living',
          command: 'turnOn',
          parameters: {},
          timestamp: new Date('2025-01-01T18:01:00Z').toISOString(),
          userId: 'user-001'
        }
      ];

      // Record multi-device pattern multiple times
      for (let i = 0; i < 7; i++) {
        for (const op of multiDeviceOperations) {
          const timestamp = new Date(`2025-01-0${i + 1}T18:00:00Z`);
          timestamp.setMinutes(timestamp.getMinutes() + i);
          await sceneLearningService.recordOperation({
            ...op,
            timestamp: timestamp.toISOString()
          });
        }
      }

      const candidates = await sceneLearningService.generateSceneCandidates();

      expect(candidates.length).toBeGreaterThan(0);
      const sequentialCandidate = candidates.find(c => c.patternType === 'sequential');
      expect(sequentialCandidate).toBeDefined();
      expect(sequentialCandidate?.operations).toHaveLength(2);
      expect(sequentialCandidate?.name).toContain('帰宅');
      expect(candidates[0].confidence).toBeGreaterThan(0.7);
    });
  });

  describe('createSceneFromCandidate', () => {
    it('should create scene from candidate', async () => {
      const candidate: SceneCandidate = {
        name: '帰宅シーン',
        operations: [
          { deviceId: 'light_entrance', command: 'turnOn', parameters: {} },
          { deviceId: 'light_living', command: 'turnOn', parameters: {} }
        ],
        confidence: 0.85,
        frequency: 10,
        patternType: 'sequential'
      };

      mockSwitchBotClient.getScenes.mockResolvedValue([]);

      const scene = await sceneLearningService.createSceneFromCandidate(candidate);

      expect(scene.name).toBe('帰宅シーン');
      expect(scene.operations).toHaveLength(2);
      expect(scene.isAutoGenerated).toBe(true);
      expect(scene.confidence).toBe(0.85);
    });

    it('should reject low confidence candidates', async () => {
      const candidate: SceneCandidate = {
        name: '低信頼度シーン',
        operations: [
          { deviceId: 'light_entrance', command: 'turnOn', parameters: {} }
        ],
        confidence: 0.3,
        frequency: 2,
        patternType: 'frequent'
      };

      await expect(
        sceneLearningService.createSceneFromCandidate(candidate)
      ).rejects.toThrow('信頼度が低すぎます');
    });
  });

  describe('getSceneSuggestions', () => {
    it('should suggest scenes based on current context', async () => {
      const context = {
        time: '18:30',
        location: 'entrance',
        recentEvents: ['door_unlock'],
        availableDevices: ['light_entrance', 'light_living']
      };

      // Record some patterns first
      const operation = {
        deviceId: 'light_entrance',
        command: 'turnOn',
        parameters: {},
        timestamp: new Date().toISOString(),
        userId: 'user-001'
      };

      for (let i = 0; i < 8; i++) {
        await sceneLearningService.recordOperation(operation);
      }

      const suggestions = await sceneLearningService.getSceneSuggestions(context);

      expect(suggestions.length).toBeGreaterThan(0);
      const learnedScene = suggestions.find(s => s.type === 'learned_scene');
      if (learnedScene) {
        expect(learnedScene.description).toContain('玄関照明');
      } else {
        // 学習済みシーンがない場合は推奨シーンが返される
        expect(suggestions[0].type).toBe('recommended_scene');
      }
      expect(suggestions[0].confidence).toBeGreaterThan(0.7);
    });
  });
});
