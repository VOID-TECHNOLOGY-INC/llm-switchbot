/**
 * SwitchBot API レスポンスキャッシュ
 * - デバイス一覧: 10-30分キャッシュ
 * - デバイス状態: 5-30秒キャッシュ（UI明示更新でバイパス）
 * - シーン一覧: 30分キャッシュ
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheConfig {
  devicesTtl: number;     // デバイス一覧キャッシュ時間
  statusTtl: number;      // デバイス状態キャッシュ時間
  scenesTtl: number;      // シーン一覧キャッシュ時間
  maxEntries: number;     // 最大エントリ数
}

export class ApiCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  
  constructor(private config: CacheConfig = {
    devicesTtl: 10 * 60 * 1000,    // 10分
    statusTtl: 30 * 1000,          // 30秒
    scenesTtl: 30 * 60 * 1000,     // 30分
    maxEntries: 1000
  }) {}

  /**
   * キャッシュキーを生成
   */
  private generateKey(endpoint: string, params?: Record<string, any>): string {
    if (!params) return endpoint;
    
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return `${endpoint}?${sortedParams}`;
  }

  /**
   * TTLを決定
   */
  private getTtl(endpoint: string): number {
    if (endpoint.includes('/devices') && !endpoint.includes('/status')) {
      return this.config.devicesTtl;
    }
    if (endpoint.includes('/status')) {
      return this.config.statusTtl;
    }
    if (endpoint.includes('/scenes')) {
      return this.config.scenesTtl;
    }
    return this.config.statusTtl; // デフォルト
  }

  /**
   * キャッシュから取得
   */
  get<T>(endpoint: string, params?: Record<string, any>): T | null {
    const key = this.generateKey(endpoint, params);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // 期限切れエントリを削除
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * キャッシュに保存
   */
  set<T>(endpoint: string, data: T, params?: Record<string, any>): void {
    const key = this.generateKey(endpoint, params);
    const ttl = this.getTtl(endpoint);
    
    // 最大エントリ数チェック
    if (this.cache.size >= this.config.maxEntries) {
      this.cleanup();
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * 特定のキャッシュを無効化
   */
  invalidate(endpoint: string, params?: Record<string, any>): void {
    const key = this.generateKey(endpoint, params);
    this.cache.delete(key);
  }

  /**
   * パターンマッチでキャッシュを無効化
   */
  invalidatePattern(pattern: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * デバイス状態キャッシュをクリア（明示更新時）
   */
  clearDeviceStatus(deviceId?: string): void {
    if (deviceId) {
      this.invalidatePattern(`/devices/${deviceId}/status`);
    } else {
      this.invalidatePattern('/status');
    }
  }

  /**
   * 期限切れエントリをクリーンアップ
   */
  cleanup(): void {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
    console.log(`Cache cleanup: removed ${removedCount} expired entries`);
  }

  /**
   * キャッシュを完全にクリア
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * キャッシュ統計情報
   */
  getStats(): {
    size: number;
    maxEntries: number;
    hitRate?: number;
    entries: Array<{
      key: string;
      size: number;
      age: number;
      ttl: number;
      expired: boolean;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      size: JSON.stringify(entry.data).length,
      age: now - entry.timestamp,
      ttl: entry.ttl,
      expired: now - entry.timestamp > entry.ttl
    }));

    return {
      size: this.cache.size,
      maxEntries: this.config.maxEntries,
      entries
    };
  }

  /**
   * キャッシュ可能な操作を実行
   */
  async getOrFetch<T>(
    endpoint: string,
    fetcher: () => Promise<T>,
    params?: Record<string, any>,
    forceRefresh: boolean = false
  ): Promise<T> {
    // 強制更新時はキャッシュをバイパス
    if (forceRefresh) {
      this.invalidate(endpoint, params);
    }
    
    // キャッシュから取得を試行
    const cached = this.get<T>(endpoint, params);
    if (cached !== null) {
      return cached;
    }
    
    // キャッシュミス - データを取得してキャッシュ
    const data = await fetcher();
    this.set(endpoint, data, params);
    
    return data;
  }
}
