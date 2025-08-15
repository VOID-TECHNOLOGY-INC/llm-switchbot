import { createAuthHeaders } from './signature';
import { RateLimiter } from './rate-limiter';
import { ApiCache } from './cache';

/**
 * SwitchBot API v1.1 クライアント（レート制限・キャッシュ対応）
 */
export class SwitchBotClient {
  private readonly baseUrl = 'https://api.switch-bot.com/v1.1';
  private readonly token: string;
  private readonly secret: string;
  private readonly rateLimiter: RateLimiter;
  private readonly cache: ApiCache;

  constructor(
    token: string, 
    secret: string,
    rateLimiter?: RateLimiter,
    cache?: ApiCache
  ) {
    this.token = token;
    this.secret = secret;
    this.rateLimiter = rateLimiter || new RateLimiter();
    this.cache = cache || new ApiCache();
  }

  /**
   * API呼び出しの共通処理（レート制限・リトライ・キャッシュ対応）
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    useCache: boolean = true,
    forceRefresh: boolean = false
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const operation = async (): Promise<T> => {
      const headers = {
        ...createAuthHeaders(this.token, this.secret),
        'Content-Type': 'application/json',
        ...options.headers
      };

      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        const errorMessage = `SwitchBot API Error: ${response.status} - ${errorData.message || 'Unknown error'}`;
        
        // レート制限エラーの場合は特別なメッセージ
        if (response.status === 429) {
          throw new Error(`${errorMessage} (Rate limit exceeded)`);
        }
        
        throw new Error(errorMessage);
      }

      return response.json();
    };

    // キャッシュ対応GET要求
    if (useCache && options.method !== 'POST') {
      return this.cache.getOrFetch(
        endpoint,
        () => this.rateLimiter.executeWithRetry(endpoint, operation),
        undefined,
        forceRefresh
      );
    }

    // キャッシュ非対応（POSTなど）
    const result = await this.rateLimiter.executeWithRetry(endpoint, operation);
    
    // POSTの場合は関連キャッシュを無効化
    if (options.method === 'POST') {
      this.invalidateRelatedCache(endpoint);
    }
    
    return result;
  }

  /**
   * 関連キャッシュを無効化
   */
  private invalidateRelatedCache(endpoint: string): void {
    if (endpoint.includes('/commands')) {
      // デバイスコマンド実行時は状態キャッシュをクリア
      const deviceId = endpoint.match(/\/devices\/([^\/]+)\/commands/)?.[1];
      if (deviceId) {
        this.cache.clearDeviceStatus(deviceId);
      }
    } else if (endpoint.includes('/scenes') && endpoint.includes('/execute')) {
      // シーン実行時は全デバイス状態をクリア
      this.cache.clearDeviceStatus();
    }
  }

  /**
   * デバイス一覧を取得
   * @param forceRefresh キャッシュを無視して強制更新
   * @returns デバイス一覧のレスポンス
   */
  async getDevices(forceRefresh: boolean = false): Promise<any> {
    return this.makeRequest('/devices', { method: 'GET' }, true, forceRefresh);
  }

  /**
   * デバイスの状態を取得
   * @param deviceId デバイスID
   * @param forceRefresh キャッシュを無視して強制更新
   * @returns デバイス状態のレスポンス
   */
  async getDeviceStatus(deviceId: string, forceRefresh: boolean = false): Promise<any> {
    if (!deviceId || deviceId.trim() === '') {
      throw new Error('Device ID is required');
    }

    return this.makeRequest(`/devices/${deviceId}/status`, { method: 'GET' }, true, forceRefresh);
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

    const body: any = {
      command,
      parameter: parameter ?? 'default',
      commandType: commandType ?? 'command'
    };

    return this.makeRequest(`/devices/${deviceId}/commands`, {
      method: 'POST',
      body: JSON.stringify(body)
    }, false);
  }

  /**
   * シーン一覧を取得
   * @param forceRefresh キャッシュを無視して強制更新
   * @returns シーン一覧のレスポンス
   */
  async getScenes(forceRefresh: boolean = false): Promise<any> {
    return this.makeRequest('/scenes', { method: 'GET' }, true, forceRefresh);
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

    return this.makeRequest(`/scenes/${sceneId}/execute`, {
      method: 'POST'
    }, false);
  }

  /**
   * レート制限とキャッシュの統計情報を取得
   */
  getStats(): {
    rateLimit: any;
    cache: any;
  } {
    return {
      rateLimit: this.rateLimiter.getStats(),
      cache: this.cache.getStats()
    };
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
  }
}
