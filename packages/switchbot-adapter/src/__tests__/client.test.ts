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
});
