import { ChatOrchestrator } from '../orchestrator/chat-orchestrator';
import { SwitchBotClient } from '@llm-switchbot/switchbot-adapter';
import { harmonyToolsSchema } from '@llm-switchbot/harmony-tools';

// SwitchBotClientをモック
jest.mock('@llm-switchbot/switchbot-adapter');
const MockedSwitchBotClient = SwitchBotClient as jest.MockedClass<typeof SwitchBotClient>;

describe('ChatOrchestrator', () => {
  let orchestrator: ChatOrchestrator;
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

    orchestrator = new ChatOrchestrator(mockSwitchBotClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with SwitchBot client', () => {
      expect(orchestrator).toBeDefined();
      expect(orchestrator.getToolsSchema()).toEqual(harmonyToolsSchema);
    });
  });

  describe('processToolCall', () => {
    it('should handle get_devices tool call', async () => {
      // Arrange
      const mockDevicesResponse = {
        statusCode: 100,
        message: 'success',
        body: {
          deviceList: [
            { deviceId: 'device-1', deviceName: 'Test Device', deviceType: 'Bot' }
          ]
        }
      };
      mockSwitchBotClient.getDevices.mockResolvedValue(mockDevicesResponse);

      const toolCall = {
        id: 'call-1',
        type: 'function' as const,
        function: {
          name: 'get_devices',
          arguments: '{}'
        }
      };

      // Act
      const result = await orchestrator.processToolCall(toolCall);

      // Assert
      expect(mockSwitchBotClient.getDevices).toHaveBeenCalledTimes(1);
      expect(result.tool_name).toBe('get_devices');
      expect(result.status).toBe('success');
      expect(result.result).toEqual(mockDevicesResponse);
    });

    it('should handle get_device_status tool call', async () => {
      // Arrange
      const deviceId = 'device-123';
      const mockStatusResponse = {
        statusCode: 100,
        message: 'success',
        body: { power: 'on', battery: 85 }
      };
      mockSwitchBotClient.getDeviceStatus.mockResolvedValue(mockStatusResponse);

      const toolCall = {
        id: 'call-2',
        type: 'function' as const,
        function: {
          name: 'get_device_status',
          arguments: JSON.stringify({ deviceId })
        }
      };

      // Act
      const result = await orchestrator.processToolCall(toolCall);

      // Assert
      expect(mockSwitchBotClient.getDeviceStatus).toHaveBeenCalledWith(deviceId);
      expect(result.tool_name).toBe('get_device_status');
      expect(result.status).toBe('success');
      expect(result.result).toEqual(mockStatusResponse);
    });

    it('should handle send_command tool call', async () => {
      // Arrange
      const commandArgs = {
        deviceId: 'device-123',
        command: 'turnOn',
        parameter: { temperature: 25 }
      };
      const mockCommandResponse = {
        statusCode: 100,
        message: 'success'
      };
      mockSwitchBotClient.sendCommand.mockResolvedValue(mockCommandResponse);

      const toolCall = {
        id: 'call-3',
        type: 'function' as const,
        function: {
          name: 'send_command',
          arguments: JSON.stringify(commandArgs)
        }
      };

      // Act
      const result = await orchestrator.processToolCall(toolCall);

      // Assert
      expect(mockSwitchBotClient.sendCommand).toHaveBeenCalledWith(
        commandArgs.deviceId,
        commandArgs.command,
        commandArgs.parameter
      );
      expect(result.tool_name).toBe('send_command');
      expect(result.status).toBe('success');
      expect(result.result).toEqual(mockCommandResponse);
    });

    it('should handle get_scenes tool call', async () => {
      // Arrange
      const mockScenesResponse = {
        statusCode: 100,
        message: 'success',
        body: [
          { sceneId: 'scene-1', sceneName: 'Morning Routine' }
        ]
      };
      mockSwitchBotClient.getScenes.mockResolvedValue(mockScenesResponse);

      const toolCall = {
        id: 'call-4',
        type: 'function' as const,
        function: {
          name: 'get_scenes',
          arguments: '{}'
        }
      };

      // Act
      const result = await orchestrator.processToolCall(toolCall);

      // Assert
      expect(mockSwitchBotClient.getScenes).toHaveBeenCalledTimes(1);
      expect(result.tool_name).toBe('get_scenes');
      expect(result.status).toBe('success');
      expect(result.result).toEqual(mockScenesResponse);
    });

    it('should handle execute_scene tool call', async () => {
      // Arrange
      const sceneId = 'scene-123';
      const mockExecuteResponse = {
        statusCode: 100,
        message: 'success'
      };
      mockSwitchBotClient.executeScene.mockResolvedValue(mockExecuteResponse);

      const toolCall = {
        id: 'call-5',
        type: 'function' as const,
        function: {
          name: 'execute_scene',
          arguments: JSON.stringify({ sceneId })
        }
      };

      // Act
      const result = await orchestrator.processToolCall(toolCall);

      // Assert
      expect(mockSwitchBotClient.executeScene).toHaveBeenCalledWith(sceneId);
      expect(result.tool_name).toBe('execute_scene');
      expect(result.status).toBe('success');
      expect(result.result).toEqual(mockExecuteResponse);
    });

    it('should handle unknown tool calls', async () => {
      // Arrange
      const toolCall = {
        id: 'call-unknown',
        type: 'function' as const,
        function: {
          name: 'unknown_tool',
          arguments: '{}'
        }
      };

      // Act
      const result = await orchestrator.processToolCall(toolCall);

      // Assert
      expect(result.tool_name).toBe('unknown_tool');
      expect(result.status).toBe('error');
      expect(result.error_message).toContain('Unknown tool');
    });

    it('should handle invalid arguments', async () => {
      // Arrange
      const toolCall = {
        id: 'call-invalid',
        type: 'function' as const,
        function: {
          name: 'send_command',
          arguments: '{"deviceId": "test"}' // missing required 'command' parameter
        }
      };

      // Act
      const result = await orchestrator.processToolCall(toolCall);

      // Assert
      expect(result.tool_name).toBe('send_command');
      expect(result.status).toBe('error');
      expect(result.error_message).toContain('Missing required parameter: command');
    });

    it('should handle SwitchBot API errors', async () => {
      // Arrange
      const toolCall = {
        id: 'call-error',
        type: 'function' as const,
        function: {
          name: 'get_devices',
          arguments: '{}'
        }
      };

      mockSwitchBotClient.getDevices.mockRejectedValue(new Error('API Error: Device not found'));

      // Act
      const result = await orchestrator.processToolCall(toolCall);

      // Assert
      expect(result.tool_name).toBe('get_devices');
      expect(result.status).toBe('error');
      expect(result.error_message).toBe('API Error: Device not found');
    });

    it('should measure execution time', async () => {
      // Arrange
      const mockResponse = { statusCode: 100, message: 'success', body: {} };
      mockSwitchBotClient.getDevices.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockResponse), 100))
      );

      const toolCall = {
        id: 'call-timing',
        type: 'function' as const,
        function: {
          name: 'get_devices',
          arguments: '{}'
        }
      };

      // Act
      const result = await orchestrator.processToolCall(toolCall);

      // Assert
      expect(result.execution_time_ms).toBeGreaterThan(90);
      expect(result.execution_time_ms).toBeLessThan(200);
    });
  });

  describe('processChat', () => {
    it('should process messages without tool calls', async () => {
      // Arrange
      const messages = [
        { role: 'user' as const, content: 'こんにちは' }
      ];

      // Act
      const result = await orchestrator.processChat(messages);

      // Assert
      expect(result.response).toBeDefined();
      expect(result.toolResults).toHaveLength(0);
      expect(result.response.role).toBe('assistant');
      expect(result.response.content).toContain('デモモード');
    });

    it('should process messages with tool calls', async () => {
      // Arrange
      const messages = [
        { role: 'user' as const, content: 'デバイス一覧を教えて' }
      ];

      const mockDevicesResponse = {
        statusCode: 100,
        message: 'success',
        body: { deviceList: [] }
      };
      mockSwitchBotClient.getDevices.mockResolvedValue(mockDevicesResponse);

      // Act
      const result = await orchestrator.processChat(messages, true);

      // Assert
      expect(result.response).toBeDefined();
      expect(result.toolResults).toHaveLength(1);
      expect(result.toolResults[0].tool_name).toBe('get_devices');
    });
  });
});
