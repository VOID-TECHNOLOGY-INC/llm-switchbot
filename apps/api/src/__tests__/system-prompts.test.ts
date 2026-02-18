import {
  generateSystemPrompt,
  FALLBACK_SYSTEM_PROMPT,
  formatDeviceInfo,
  parseRestrictedDeviceIds,
  type DeviceInfo,
  type SystemPromptConfig,
} from "../config/system-prompts";

describe("system-prompts", () => {
  describe("formatDeviceInfo", () => {
    it("should format physical devices with infrared remotes", () => {
      const apiResponse = {
        statusCode: 100,
        message: "success",
        body: {
          deviceList: [
            {
              deviceId: "ABC123",
              deviceName: "リビング温湿度計",
              deviceType: "MeterPlus",
              enableCloudService: true,
              hubDeviceId: "HUB001",
            },
          ],
          infraredRemoteList: [
            {
              deviceId: "IR-001",
              deviceName: "エアコン",
              remoteType: "Air Conditioner",
              hubDeviceId: "HUB001",
            },
          ],
        },
      };

      const result = formatDeviceInfo(apiResponse, []);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        deviceId: "ABC123",
        deviceName: "リビング温湿度計",
        deviceType: "MeterPlus",
        isRestricted: false,
      });
      expect(result[1]).toEqual({
        deviceId: "IR-001",
        deviceName: "エアコン",
        deviceType: "Air Conditioner",
        isRestricted: false,
      });
    });

    it("should mark restricted devices", () => {
      const apiResponse = {
        statusCode: 100,
        message: "success",
        body: {
          deviceList: [
            {
              deviceId: "DEV-1",
              deviceName: "ハブミニ",
              deviceType: "Hub Mini",
              enableCloudService: true,
              hubDeviceId: "",
            },
          ],
          infraredRemoteList: [
            {
              deviceId: "IR-TV",
              deviceName: "テレビ",
              remoteType: "TV",
              hubDeviceId: "DEV-1",
            },
          ],
        },
      };

      const result = formatDeviceInfo(apiResponse, ["IR-TV"]);

      expect(result).toHaveLength(2);
      expect(result[0].isRestricted).toBe(false);
      expect(result[1].isRestricted).toBe(true);
    });

    it("should handle empty device lists", () => {
      const apiResponse = {
        statusCode: 100,
        message: "success",
        body: {
          deviceList: [],
          infraredRemoteList: [],
        },
      };

      const result = formatDeviceInfo(apiResponse, []);
      expect(result).toHaveLength(0);
    });

    it("should handle missing body gracefully", () => {
      const apiResponse = { statusCode: 100, message: "success" };
      const result = formatDeviceInfo(apiResponse, []);
      expect(result).toHaveLength(0);
    });
  });

  describe("generateSystemPrompt", () => {
    const sampleDevices: DeviceInfo[] = [
      {
        deviceId: "HUB-001",
        deviceName: "ハブミニ",
        deviceType: "Hub Mini",
        isRestricted: false,
      },
      {
        deviceId: "METER-001",
        deviceName: "温湿度計",
        deviceType: "MeterPlus",
        isRestricted: false,
      },
      {
        deviceId: "IR-AC",
        deviceName: "エアコン",
        deviceType: "Air Conditioner",
        isRestricted: true,
      },
    ];

    it("should include device list in the prompt", () => {
      const prompt = generateSystemPrompt(sampleDevices);

      expect(prompt).toContain("ハブミニ");
      expect(prompt).toContain("HUB-001");
      expect(prompt).toContain("Hub Mini");
      expect(prompt).toContain("温湿度計");
      expect(prompt).toContain("METER-001");
    });

    it("should mark restricted devices with warning", () => {
      const prompt = generateSystemPrompt(sampleDevices);

      expect(prompt).toContain("操作禁止");
      expect(prompt).toContain("エアコン");
    });

    it("should include safety instructions", () => {
      const prompt = generateSystemPrompt(sampleDevices);

      expect(prompt).toContain("スマートホーム制御アシスタント");
      expect(prompt).toContain("ツール");
      expect(prompt).toContain("危険");
    });

    it("should include custom instructions when provided", () => {
      const config: SystemPromptConfig = {
        customInstructions: "深夜帯（23:00-06:00）は操作を控えてください",
      };

      const prompt = generateSystemPrompt(sampleDevices, config);

      expect(prompt).toContain("深夜帯（23:00-06:00）は操作を控えてください");
    });

    it("should handle empty device list with informative message", () => {
      const prompt = generateSystemPrompt([]);

      expect(prompt).toContain("スマートホーム制御アシスタント");
      expect(prompt).toContain("get_devices");
    });

    it("should set temperature guidance for tool calls", () => {
      const prompt = generateSystemPrompt(sampleDevices);

      expect(prompt).toContain("自然言語で説明");
    });
  });

  describe("FALLBACK_SYSTEM_PROMPT", () => {
    it("should provide basic instructions without device info", () => {
      expect(FALLBACK_SYSTEM_PROMPT).toContain(
        "スマートホーム制御アシスタント",
      );
      expect(FALLBACK_SYSTEM_PROMPT).toContain("get_devices");
      expect(FALLBACK_SYSTEM_PROMPT).not.toContain("ID:");
    });
  });

  describe("parseRestrictedDeviceIds", () => {
    it("should parse comma-separated device IDs", () => {
      const result = parseRestrictedDeviceIds("DEV-1,DEV-2,DEV-3");
      expect(result).toEqual(["DEV-1", "DEV-2", "DEV-3"]);
    });

    it("should trim whitespace from IDs", () => {
      const result = parseRestrictedDeviceIds(" DEV-1 , DEV-2 , DEV-3 ");
      expect(result).toEqual(["DEV-1", "DEV-2", "DEV-3"]);
    });

    it("should return empty array for empty string", () => {
      const result = parseRestrictedDeviceIds("");
      expect(result).toEqual([]);
    });

    it("should return empty array for undefined", () => {
      const result = parseRestrictedDeviceIds(undefined);
      expect(result).toEqual([]);
    });

    it("should filter out empty entries", () => {
      const result = parseRestrictedDeviceIds("DEV-1,,DEV-2,");
      expect(result).toEqual(["DEV-1", "DEV-2"]);
    });
  });
});
