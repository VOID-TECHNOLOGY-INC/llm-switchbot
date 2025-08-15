import { SwitchBotClient } from '../client';

// モックのHTTPレスポンス
const mockDevicesResponse = {
  statusCode: 100,
  message: "success",
  body: {
    deviceList: [
      {
        deviceId: "test-device-1",
        deviceName: "Test Hub Mini",
        deviceType: "Hub Mini",
        enableCloudService: true,
        hubDeviceId: ""
      },
      {
        deviceId: "test-device-2", 
        deviceName: "Test Bot",
        deviceType: "Bot",
        enableCloudService: true,
        hubDeviceId: "test-device-1"
      }
    ],
    infraredRemoteList: []
  }
};

// fetch をモック
global.fetch = jest.fn();

describe('SwitchBotClient', () => {
  let client: SwitchBotClient;
  const mockToken = 'test-token';
  const mockSecret = 'test-secret';

  beforeEach(() => {
    client = new SwitchBotClient(mockToken, mockSecret);
    jest.clearAllMocks();
  });

  describe('getDevices', () => {
    it('should fetch devices list successfully', async () => {
      // Arrange
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDevicesResponse
      });

      // Act
      const result = await client.getDevices();

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        'https://api.switch-bot.com/v1.1/devices',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': mockToken,
            'sign': expect.any(String),
            't': expect.stringMatching(/^\d{13}$/),
            'nonce': expect.any(String),
            'Content-Type': 'application/json'
          })
        })
      );

      expect(result).toEqual(mockDevicesResponse);
    });

    it('should handle API error response', async () => {
      // Arrange
      const errorResponse = {
        statusCode: 401,
        message: "Unauthorized"
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => errorResponse
      });

      // Act & Assert
      await expect(client.getDevices()).rejects.toThrow('SwitchBot API Error: 401 - Unauthorized');
    });

    it('should handle network error', async () => {
      // Arrange
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Act & Assert
      await expect(client.getDevices()).rejects.toThrow('Network error');
    });
  });

  describe('getDeviceStatus', () => {
    const deviceId = 'test-device-1';
    const mockStatusResponse = {
      statusCode: 100,
      message: "success",
      body: {
        deviceId: deviceId,
        deviceType: "Hub Mini",
        hubDeviceId: "",
        power: "on",
        version: "v1.0"
      }
    };

    it('should fetch device status successfully', async () => {
      // Arrange
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatusResponse
      });

      // Act
      const result = await client.getDeviceStatus(deviceId);

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        `https://api.switch-bot.com/v1.1/devices/${deviceId}/status`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': mockToken
          })
        })
      );

      expect(result).toEqual(mockStatusResponse);
    });

    it('should validate deviceId parameter', async () => {
      // Act & Assert
      await expect(client.getDeviceStatus('')).rejects.toThrow('Device ID is required');
    });
  });

  describe('sendCommand', () => {
    const deviceId = 'test-device-2';
    const mockCommandResponse = {
      statusCode: 100,
      message: "success"
    };

    it('should send turnOn command successfully', async () => {
      // Arrange
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCommandResponse
      });

      // Act
      const result = await client.sendCommand(deviceId, 'turnOn');

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        `https://api.switch-bot.com/v1.1/devices/${deviceId}/commands`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': mockToken,
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            command: 'turnOn',
            parameter: 'default',
            commandType: 'command'
          })
        })
      );

      expect(result).toEqual(mockCommandResponse);
    });

    it('should send command with custom parameters', async () => {
      // Arrange
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCommandResponse
      });

      // Act
      const result = await client.sendCommand(deviceId, 'setMode', { level: 50 }, 'customize');

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        `https://api.switch-bot.com/v1.1/devices/${deviceId}/commands`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            command: 'setMode',
            parameter: { level: 50 },
            commandType: 'customize'
          })
        })
      );

      expect(result).toEqual(mockCommandResponse);
    });

    it('should validate required parameters', async () => {
      // Act & Assert
      await expect(client.sendCommand('', 'turnOn')).rejects.toThrow('Device ID is required');
      await expect(client.sendCommand(deviceId, '')).rejects.toThrow('Command is required');
    });

    it('should handle command execution errors', async () => {
      // Arrange
      const errorResponse = {
        statusCode: 190,
        message: "Device internal error due to device states not synchronized with server"
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => errorResponse
      });

      // Act & Assert
      await expect(client.sendCommand(deviceId, 'turnOn')).rejects.toThrow('SwitchBot API Error: 500 - Device internal error due to device states not synchronized with server');
    });
  });

  describe('getScenes', () => {
    const mockScenesResponse = {
      statusCode: 100,
      message: "success",
      body: [
        {
          sceneId: "scene-1",
          sceneName: "Morning Routine"
        },
        {
          sceneId: "scene-2", 
          sceneName: "Evening Routine"
        }
      ]
    };

    it('should fetch scenes list successfully', async () => {
      // Arrange
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockScenesResponse
      });

      // Act
      const result = await client.getScenes();

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        'https://api.switch-bot.com/v1.1/scenes',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': mockToken
          })
        })
      );

      expect(result).toEqual(mockScenesResponse);
    });
  });

  describe('executeScene', () => {
    const sceneId = 'scene-1';
    const mockExecuteResponse = {
      statusCode: 100,
      message: "success"
    };

    it('should execute scene successfully', async () => {
      // Arrange
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockExecuteResponse
      });

      // Act
      const result = await client.executeScene(sceneId);

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        `https://api.switch-bot.com/v1.1/scenes/${sceneId}/execute`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': mockToken
          })
        })
      );

      expect(result).toEqual(mockExecuteResponse);
    });

    it('should validate scene ID parameter', async () => {
      // Act & Assert
      await expect(client.executeScene('')).rejects.toThrow('Scene ID is required');
    });
  });
});
