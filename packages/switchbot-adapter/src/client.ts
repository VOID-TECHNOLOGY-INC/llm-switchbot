import { createAuthHeaders } from './signature';

/**
 * SwitchBot API v1.1 クライアント
 */
export class SwitchBotClient {
  private readonly baseUrl = 'https://api.switch-bot.com/v1.1';
  private readonly token: string;
  private readonly secret: string;

  constructor(token: string, secret: string) {
    this.token = token;
    this.secret = secret;
  }

  /**
   * デバイス一覧を取得
   * @returns デバイス一覧のレスポンス
   */
  async getDevices(): Promise<any> {
    const url = `${this.baseUrl}/devices`;
    const headers = createAuthHeaders(this.token, this.secret);

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as any;
      throw new Error(`SwitchBot API Error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    return response.json();
  }

  /**
   * デバイスの状態を取得
   * @param deviceId デバイスID
   * @returns デバイス状態のレスポンス
   */
  async getDeviceStatus(deviceId: string): Promise<any> {
    if (!deviceId || deviceId.trim() === '') {
      throw new Error('Device ID is required');
    }

    const url = `${this.baseUrl}/devices/${deviceId}/status`;
    const headers = createAuthHeaders(this.token, this.secret);

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as any;
      throw new Error(`SwitchBot API Error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    return response.json();
  }

  /**
   * デバイスにコマンドを送信
   * @param deviceId デバイスID
   * @param command コマンド名
   * @param parameter パラメータ（オプション）
   * @param commandType コマンドタイプ（オプション）
   * @returns コマンド実行結果
   */
  async sendCommand(
    deviceId: string,
    command: string,
    parameter?: any,
    commandType?: string
  ): Promise<any> {
    if (!deviceId || deviceId.trim() === '') {
      throw new Error('Device ID is required');
    }
    if (!command || command.trim() === '') {
      throw new Error('Command is required');
    }

    const url = `${this.baseUrl}/devices/${deviceId}/commands`;
    const headers = createAuthHeaders(this.token, this.secret);

    const body: any = {
      command,
      parameter: parameter ?? 'default',
      commandType: commandType ?? 'command'
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as any;
      throw new Error(`SwitchBot API Error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    return response.json();
  }

  /**
   * シーン一覧を取得
   * @returns シーン一覧のレスポンス
   */
  async getScenes(): Promise<any> {
    const url = `${this.baseUrl}/scenes`;
    const headers = createAuthHeaders(this.token, this.secret);

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as any;
      throw new Error(`SwitchBot API Error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    return response.json();
  }

  /**
   * シーンを実行
   * @param sceneId シーンID
   * @returns シーン実行結果
   */
  async executeScene(sceneId: string): Promise<any> {
    if (!sceneId || sceneId.trim() === '') {
      throw new Error('Scene ID is required');
    }

    const url = `${this.baseUrl}/scenes/${sceneId}/execute`;
    const headers = createAuthHeaders(this.token, this.secret);

    const response = await fetch(url, {
      method: 'POST',
      headers
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as any;
      throw new Error(`SwitchBot API Error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    return response.json();
  }
}
