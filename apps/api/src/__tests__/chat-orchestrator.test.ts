import { ChatOrchestrator } from "../orchestrator/chat-orchestrator";
import { SwitchBotClient } from "@llm-switchbot/switchbot-adapter";
import { harmonyToolsSchema } from "@llm-switchbot/harmony-tools";
import { FALLBACK_SYSTEM_PROMPT } from "../config/system-prompts";

// SwitchBotClientをモック
jest.mock("@llm-switchbot/switchbot-adapter");
const MockedSwitchBotClient = SwitchBotClient as jest.MockedClass<
  typeof SwitchBotClient
>;

describe("ChatOrchestrator", () => {
  let orchestrator: ChatOrchestrator;
  let mockSwitchBotClient: jest.Mocked<SwitchBotClient>;

  const mockDevicesApiResponse = {
    statusCode: 100,
    message: "success",
    body: {
      deviceList: [
        {
          deviceId: "HUB-001",
          deviceName: "ハブミニ",
          deviceType: "Hub Mini",
          enableCloudService: true,
          hubDeviceId: "",
        },
        {
          deviceId: "METER-001",
          deviceName: "温湿度計",
          deviceType: "MeterPlus",
          enableCloudService: true,
          hubDeviceId: "HUB-001",
        },
      ],
      infraredRemoteList: [
        {
          deviceId: "IR-AC-001",
          deviceName: "エアコン",
          remoteType: "Air Conditioner",
          hubDeviceId: "HUB-001",
        },
      ],
    },
  };

  beforeEach(() => {
    // SwitchBotClientのモックインスタンスを作成
    mockSwitchBotClient = new MockedSwitchBotClient(
      "test-token",
      "test-secret",
    ) as jest.Mocked<SwitchBotClient>;

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

  describe("constructor", () => {
    it("should initialize with SwitchBot client", () => {
      expect(orchestrator).toBeDefined();
      expect(orchestrator.getToolsSchema()).toEqual(harmonyToolsSchema);
    });
  });

  describe("processToolCall", () => {
    it("should handle get_devices tool call", async () => {
      // Arrange
      const mockDevicesResponse = {
        statusCode: 100,
        message: "success",
        body: {
          deviceList: [
            {
              deviceId: "device-1",
              deviceName: "Test Device",
              deviceType: "Bot",
            },
          ],
        },
      };
      mockSwitchBotClient.getDevices.mockResolvedValue(mockDevicesResponse);

      const toolCall = {
        id: "call-1",
        type: "function" as const,
        function: {
          name: "get_devices",
          arguments: "{}",
        },
      };

      // Act
      const result = await orchestrator.processToolCall(toolCall);

      // Assert
      expect(mockSwitchBotClient.getDevices).toHaveBeenCalledTimes(1);
      expect(result.tool_name).toBe("get_devices");
      expect(result.status).toBe("success");
      expect(result.result).toEqual(mockDevicesResponse);
    });

    it("should handle get_device_status tool call", async () => {
      // Arrange
      const deviceId = "device-123";
      const mockStatusResponse = {
        statusCode: 100,
        message: "success",
        body: { power: "on", battery: 85 },
      };
      mockSwitchBotClient.getDeviceStatus.mockResolvedValue(mockStatusResponse);

      const toolCall = {
        id: "call-2",
        type: "function" as const,
        function: {
          name: "get_device_status",
          arguments: JSON.stringify({ deviceId }),
        },
      };

      // Act
      const result = await orchestrator.processToolCall(toolCall);

      // Assert
      expect(mockSwitchBotClient.getDeviceStatus).toHaveBeenCalledWith(
        deviceId,
      );
      expect(result.tool_name).toBe("get_device_status");
      expect(result.status).toBe("success");
      expect(result.result).toEqual(mockStatusResponse);
    });

    it("should handle send_command tool call", async () => {
      // Arrange
      const commandArgs = {
        deviceId: "device-123",
        command: "turnOn",
        parameter: { temperature: 25 },
      };
      const mockCommandResponse = {
        statusCode: 100,
        message: "success",
      };
      mockSwitchBotClient.sendCommand.mockResolvedValue(mockCommandResponse);

      const toolCall = {
        id: "call-3",
        type: "function" as const,
        function: {
          name: "send_command",
          arguments: JSON.stringify(commandArgs),
        },
      };

      // Act
      const result = await orchestrator.processToolCall(toolCall);

      // Assert
      expect(mockSwitchBotClient.sendCommand).toHaveBeenCalledWith(
        commandArgs.deviceId,
        commandArgs.command,
        commandArgs.parameter,
      );
      expect(result.tool_name).toBe("send_command");
      expect(result.status).toBe("success");
      expect(result.result).toEqual(mockCommandResponse);
    });

    it("should handle get_scenes tool call", async () => {
      // Arrange
      const mockScenesResponse = {
        statusCode: 100,
        message: "success",
        body: [{ sceneId: "scene-1", sceneName: "Morning Routine" }],
      };
      mockSwitchBotClient.getScenes.mockResolvedValue(mockScenesResponse);

      const toolCall = {
        id: "call-4",
        type: "function" as const,
        function: {
          name: "get_scenes",
          arguments: "{}",
        },
      };

      // Act
      const result = await orchestrator.processToolCall(toolCall);

      // Assert
      expect(mockSwitchBotClient.getScenes).toHaveBeenCalledTimes(1);
      expect(result.tool_name).toBe("get_scenes");
      expect(result.status).toBe("success");
      expect(result.result).toEqual(mockScenesResponse);
    });

    it("should handle execute_scene tool call", async () => {
      // Arrange
      const sceneId = "scene-123";
      const mockExecuteResponse = {
        statusCode: 100,
        message: "success",
      };
      mockSwitchBotClient.executeScene.mockResolvedValue(mockExecuteResponse);

      const toolCall = {
        id: "call-5",
        type: "function" as const,
        function: {
          name: "execute_scene",
          arguments: JSON.stringify({ sceneId }),
        },
      };

      // Act
      const result = await orchestrator.processToolCall(toolCall);

      // Assert
      expect(mockSwitchBotClient.executeScene).toHaveBeenCalledWith(sceneId);
      expect(result.tool_name).toBe("execute_scene");
      expect(result.status).toBe("success");
      expect(result.result).toEqual(mockExecuteResponse);
    });

    it("should handle unknown tool calls", async () => {
      // Arrange
      const toolCall = {
        id: "call-unknown",
        type: "function" as const,
        function: {
          name: "unknown_tool",
          arguments: "{}",
        },
      };

      // Act
      const result = await orchestrator.processToolCall(toolCall);

      // Assert
      expect(result.tool_name).toBe("unknown_tool");
      expect(result.status).toBe("error");
      expect(result.error_message).toContain("Unknown tool");
    });

    it("should handle invalid arguments", async () => {
      // Arrange
      const toolCall = {
        id: "call-invalid",
        type: "function" as const,
        function: {
          name: "send_command",
          arguments: '{"deviceId": "test"}', // missing required 'command' parameter
        },
      };

      // Act
      const result = await orchestrator.processToolCall(toolCall);

      // Assert
      expect(result.tool_name).toBe("send_command");
      expect(result.status).toBe("error");
      expect(result.error_message).toContain(
        "Missing required parameter: command",
      );
    });

    it("should handle SwitchBot API errors", async () => {
      // Arrange
      const toolCall = {
        id: "call-error",
        type: "function" as const,
        function: {
          name: "get_devices",
          arguments: "{}",
        },
      };

      mockSwitchBotClient.getDevices.mockRejectedValue(
        new Error("API Error: Device not found"),
      );

      // Act
      const result = await orchestrator.processToolCall(toolCall);

      // Assert
      expect(result.tool_name).toBe("get_devices");
      expect(result.status).toBe("error");
      expect(result.error_message).toBe("API Error: Device not found");
    });

    it("should measure execution time", async () => {
      // Arrange
      const mockResponse = { statusCode: 100, message: "success", body: {} };
      mockSwitchBotClient.getDevices.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockResponse), 100),
          ),
      );

      const toolCall = {
        id: "call-timing",
        type: "function" as const,
        function: {
          name: "get_devices",
          arguments: "{}",
        },
      };

      // Act
      const result = await orchestrator.processToolCall(toolCall);

      // Assert
      expect(result.execution_time_ms).toBeGreaterThan(90);
      expect(result.execution_time_ms).toBeLessThan(200);
    });
  });

  describe("processChat", () => {
    it("should process messages without tool calls", async () => {
      // Arrange
      const messages = [{ role: "user" as const, content: "こんにちは" }];

      // Act
      const result = await orchestrator.processChat(messages);

      // Assert
      expect(result.response).toBeDefined();
      expect(result.toolResults).toHaveLength(0);
      expect(result.response.role).toBe("assistant");
      expect(result.response.content).toContain("デモモード");
    });

    it("should process messages with tool calls", async () => {
      // Arrange
      const messages = [
        { role: "user" as const, content: "デバイス一覧を教えて" },
      ];

      const mockDevicesResponse = {
        statusCode: 100,
        message: "success",
        body: { deviceList: [] },
      };
      mockSwitchBotClient.getDevices.mockResolvedValue(mockDevicesResponse);

      // Act
      const result = await orchestrator.processChat(messages, true);

      // Assert
      expect(result.response).toBeDefined();
      expect(result.toolResults).toHaveLength(1);
      expect(result.toolResults[0].tool_name).toBe("get_devices");
    });
  });

  describe("generateSystemMessage", () => {
    it("should generate prompt with dynamic device info", async () => {
      // Arrange
      mockSwitchBotClient.getDevices.mockResolvedValue(mockDevicesApiResponse);

      // Act
      const message = await orchestrator.generateSystemMessage();

      // Assert
      expect(message.role).toBe("system");
      expect(message.content).toContain("ハブミニ");
      expect(message.content).toContain("HUB-001");
      expect(message.content).toContain("温湿度計");
      expect(message.content).toContain("エアコン");
    });

    it("should mark restricted devices in prompt", async () => {
      // Arrange
      mockSwitchBotClient.getDevices.mockResolvedValue(mockDevicesApiResponse);
      const restrictedOrch = new ChatOrchestrator(
        mockSwitchBotClient,
        undefined,
        {
          restrictedDeviceIds: ["IR-AC-001"],
        },
      );

      // Act
      const message = await restrictedOrch.generateSystemMessage();

      // Assert
      expect(message.content).toContain("操作禁止");
      expect(message.content).toContain("エアコン");
    });

    it("should use fallback prompt when device fetch fails", async () => {
      // Arrange
      mockSwitchBotClient.getDevices.mockRejectedValue(
        new Error("Network error"),
      );

      // Act
      const message = await orchestrator.generateSystemMessage();

      // Assert
      expect(message.role).toBe("system");
      expect(message.content).toBe(FALLBACK_SYSTEM_PROMPT);
    });

    it("should cache device info for subsequent calls", async () => {
      // Arrange
      mockSwitchBotClient.getDevices.mockResolvedValue(mockDevicesApiResponse);

      // Act
      await orchestrator.generateSystemMessage();
      await orchestrator.generateSystemMessage();

      // Assert — API should be called only once due to caching
      expect(mockSwitchBotClient.getDevices).toHaveBeenCalledTimes(1);
    });

    it("should refresh cache after TTL expires", async () => {
      // Arrange
      mockSwitchBotClient.getDevices.mockResolvedValue(mockDevicesApiResponse);
      const shortTtlOrch = new ChatOrchestrator(
        mockSwitchBotClient,
        undefined,
        {
          promptCacheTtlMs: 50,
        },
      );

      // Act
      await shortTtlOrch.generateSystemMessage();
      await new Promise((resolve) => setTimeout(resolve, 60));
      await shortTtlOrch.generateSystemMessage();

      // Assert
      expect(mockSwitchBotClient.getDevices).toHaveBeenCalledTimes(2);
    });
  });
});
