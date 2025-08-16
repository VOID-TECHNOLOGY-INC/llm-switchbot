import { AutomationProposalService } from '../services/automation-proposal';
import { SwitchBotClient } from '@llm-switchbot/switchbot-adapter';
import { AutomationEvent, AutomationSuggestion } from '@llm-switchbot/shared';

// Mock SwitchBotClient
jest.mock('@llm-switchbot/switchbot-adapter');

describe('AutomationProposalService', () => {
  let automationService: AutomationProposalService;
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

    automationService = new AutomationProposalService(mockSwitchBotClient);
  });

  describe('analyzeEvent', () => {
    it('should analyze door open event and suggest lighting automation', async () => {
      const event: AutomationEvent = {
        eventType: 'deviceStateChange',
        deviceType: 'Lock',
        deviceId: 'lock-001',
        state: 'unlocked',
        timestamp: new Date().toISOString(),
        context: {
          time: '18:30',
          location: 'entrance'
        }
      };

      const proposal = await automationService.analyzeEvent(event);

      expect(proposal).toBeDefined();
      expect(proposal.suggestions).toHaveLength(1);
      expect(proposal.suggestions[0].type).toBe('lighting');
      expect(proposal.suggestions[0].description).toContain('照明');
      expect(proposal.confidence).toBeGreaterThan(0.7);
    });

    it('should analyze temperature change and suggest climate control', async () => {
      const event: AutomationEvent = {
        eventType: 'sensorData',
        deviceType: 'Meter',
        deviceId: 'meter-001',
        state: { temperature: 30, humidity: 60 },
        timestamp: new Date().toISOString(),
        context: {
          time: '14:00',
          location: 'living_room'
        }
      };

      const proposal = await automationService.analyzeEvent(event);

      expect(proposal).toBeDefined();
      expect(proposal.suggestions).toHaveLength(1);
      expect(proposal.suggestions[0].type).toBe('climate');
      expect(proposal.suggestions[0].description).toContain('エアコン');
      expect(proposal.confidence).toBeGreaterThan(0.6);
    });

    it('should return empty suggestions for unrecognized events', async () => {
      const event: AutomationEvent = {
        eventType: 'unknown',
        deviceType: 'Unknown',
        deviceId: 'unknown-001',
        state: {},
        timestamp: new Date().toISOString()
      };

      const proposal = await automationService.analyzeEvent(event);

      expect(proposal.suggestions).toHaveLength(0);
      expect(proposal.confidence).toBe(0);
    });
  });

  describe('generateProposal', () => {
    it('should generate lighting proposal for evening entry', async () => {
      const context = {
        time: '19:30',
        location: 'entrance',
        recentEvents: ['door_unlock'],
        availableDevices: ['light_entrance', 'light_living']
      };

      const proposal = await automationService.generateProposal(context);

      expect(proposal.type).toBe('lighting');
      expect(proposal.description).toContain('照明');
      expect(proposal.actions).toHaveLength(1);
      expect(proposal.actions[0].deviceId).toBe('light_entrance');
      expect(proposal.actions[0].command).toBe('turnOn');
    });

    it('should generate climate proposal for high temperature', async () => {
      const context = {
        time: '15:00',
        location: 'living_room',
        recentEvents: ['temperature_high'],
        availableDevices: ['aircon_living'],
        sensorData: { temperature: 30, humidity: 70 }
      };

      const proposal = await automationService.generateProposal(context);

      expect(proposal.type).toBe('climate');
      expect(proposal.description).toContain('エアコン');
      expect(proposal.actions).toHaveLength(1);
      expect(proposal.actions[0].deviceId).toBe('aircon_living');
      expect(proposal.actions[0].command).toBe('turnOn');
    });
  });

  describe('validateProposal', () => {
    it('should validate feasible proposal', async () => {
      const proposal: AutomationSuggestion = {
        type: 'lighting',
        description: '玄関の照明を点灯',
        confidence: 0.8,
        actions: [
          { deviceId: 'light_entrance', command: 'turnOn', parameters: {} }
        ]
      };

      mockSwitchBotClient.getDeviceStatus.mockResolvedValue({
        deviceId: 'light_entrance',
        online: true,
        power: 'off'
      });

      const validation = await automationService.validateProposal(proposal);

      expect(validation.isValid).toBe(true);
      expect(validation.reason).toBe('実行可能');
    });

    it('should reject proposal for offline device', async () => {
      const proposal: AutomationSuggestion = {
        type: 'lighting',
        description: '玄関の照明を点灯',
        confidence: 0.8,
        actions: [
          { deviceId: 'light_entrance', command: 'turnOn', parameters: {} }
        ]
      };

      mockSwitchBotClient.getDeviceStatus.mockResolvedValue({
        deviceId: 'light_entrance',
        online: false,
        power: 'unknown'
      });

      const validation = await automationService.validateProposal(proposal);

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('オフライン');
    });
  });
});
