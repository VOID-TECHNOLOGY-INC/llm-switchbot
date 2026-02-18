export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  isRestricted: boolean;
}

export interface SystemPromptConfig {
  restrictedDeviceIds?: string[];
  customInstructions?: string;
}

/**
 * SwitchBot API レスポンスからデバイス情報を抽出し、制限情報を付加する。
 * deviceList（物理デバイス）と infraredRemoteList（赤外線リモコン）の両方を統合する。
 */
export function formatDeviceInfo(
  apiResponse: Record<string, unknown>,
  restrictedIds: string[],
): DeviceInfo[] {
  const body = apiResponse.body as
    | {
        deviceList?: Array<{
          deviceId: string;
          deviceName: string;
          deviceType: string;
        }>;
        infraredRemoteList?: Array<{
          deviceId: string;
          deviceName: string;
          remoteType: string;
        }>;
      }
    | undefined;

  if (!body) return [];

  const restricted = new Set(restrictedIds);
  const devices: DeviceInfo[] = [];

  for (const d of body.deviceList ?? []) {
    devices.push({
      deviceId: d.deviceId,
      deviceName: d.deviceName,
      deviceType: d.deviceType,
      isRestricted: restricted.has(d.deviceId),
    });
  }

  for (const ir of body.infraredRemoteList ?? []) {
    devices.push({
      deviceId: ir.deviceId,
      deviceName: ir.deviceName,
      deviceType: ir.remoteType,
      isRestricted: restricted.has(ir.deviceId),
    });
  }

  return devices;
}

/**
 * デバイス情報と設定からシステムプロンプトを動的に生成する。
 */
export function generateSystemPrompt(
  devices: DeviceInfo[],
  config?: SystemPromptConfig,
): string {
  if (devices.length === 0) {
    return `あなたはスマートホーム制御アシスタントです。SwitchBot APIを使用してデバイスを操作できます。

現在デバイス情報を保持していません。get_devicesツールを使用して利用可能なデバイスを確認してください。

**重要な指示:**
1. まずget_devicesで利用可能なデバイスを確認してください
2. 明確にデバイス操作を求められた場合のみツールを使用してください
3. ツール実行後は、取得した結果を分かりやすく自然言語で説明してください
4. 危険な操作（解錠など）はユーザーに確認を取ってから実行してください`;
  }

  const restrictedDevices = devices.filter((d) => d.isRestricted);

  const deviceLines = devices
    .map((d) => {
      const tag = d.isRestricted ? " (操作禁止)" : "";
      return `- ${d.deviceName} (ID: ${d.deviceId}) - ${d.deviceType}${tag}`;
    })
    .join("\n");

  const restrictedWarning =
    restrictedDevices.length > 0
      ? `\n以下のデバイスの操作は禁止されています。絶対に操作しないでください: ${restrictedDevices.map((d) => d.deviceName).join("、")}`
      : "";

  const customBlock = config?.customInstructions
    ? `\n\n**追加指示:**\n${config.customInstructions}`
    : "";

  return `あなたはスマートホーム制御アシスタントです。SwitchBot APIを使用してデバイスを操作できます。

**利用可能なデバイス:**
${deviceLines}
${restrictedWarning}
**重要な指示:**
1. デバイスIDがわかっている場合、get_devicesを呼ぶ必要はありません
2. 明確にデバイス操作を求められた場合のみツールを使用してください
3. ツール実行後は、取得した結果を分かりやすく自然言語で説明してください
4. 温湿度計の結果では、温度・湿度・バッテリー状態と快適度を説明してください
5. 危険な操作（解錠など）はユーザーに確認を取ってから実行してください${customBlock}`;
}

/**
 * 環境変数文字列からカンマ区切りのデバイスIDリストをパースする。
 */
export function parseRestrictedDeviceIds(
  envValue: string | undefined,
): string[] {
  if (!envValue) return [];
  return envValue
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

/**
 * デバイス情報取得に失敗した場合のフォールバックプロンプト。
 * LLMにget_devicesツールの使用を促す。
 */
export const FALLBACK_SYSTEM_PROMPT = `あなたはスマートホーム制御アシスタントです。SwitchBot APIを使用してデバイスを操作できます。

デバイス情報の取得に失敗しました。get_devicesツールを使用して利用可能なデバイスを確認してください。

**重要な指示:**
1. まずget_devicesで利用可能なデバイスを確認してください
2. 明確にデバイス操作を求められた場合のみツールを使用してください
3. ツール実行後は、取得した結果を分かりやすく自然言語で説明してください
4. 危険な操作（解錠など）はユーザーに確認を取ってから実行してください`;
