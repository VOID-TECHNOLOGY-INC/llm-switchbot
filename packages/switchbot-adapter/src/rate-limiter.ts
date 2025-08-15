/**
 * SwitchBot API レート制限管理
 * - 日次10,000回制限に対応
 * - エンドポイント別制限
 * - 指数バックオフリトライ
 */

interface RateLimitConfig {
  maxRequestsPerDay: number;
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  retryDelayMs: number;
  maxRetries: number;
}

interface RequestRecord {
  timestamp: number;
  endpoint: string;
}

export class RateLimiter {
  private requests: RequestRecord[] = [];
  private retryDelays: Map<string, number> = new Map();
  
  constructor(private config: RateLimitConfig = {
    maxRequestsPerDay: 10000,
    maxRequestsPerMinute: 100,
    maxRequestsPerHour: 1000,
    retryDelayMs: 1000,
    maxRetries: 3
  }) {}

  /**
   * API呼び出し可能かチェック
   */
  canMakeRequest(endpoint: string): boolean {
    const now = Date.now();
    
    // 古いレコードを削除（24時間以上前）
    this.requests = this.requests.filter(
      record => now - record.timestamp < 24 * 60 * 60 * 1000
    );

    const todayRequests = this.requests.length;
    const lastHourRequests = this.requests.filter(
      record => now - record.timestamp < 60 * 60 * 1000
    ).length;
    const lastMinuteRequests = this.requests.filter(
      record => now - record.timestamp < 60 * 1000
    ).length;

    // レート制限チェック
    if (todayRequests >= this.config.maxRequestsPerDay) {
      throw new Error(`Daily rate limit exceeded: ${todayRequests}/${this.config.maxRequestsPerDay}`);
    }
    
    if (lastHourRequests >= this.config.maxRequestsPerHour) {
      throw new Error(`Hourly rate limit exceeded: ${lastHourRequests}/${this.config.maxRequestsPerHour}`);
    }
    
    if (lastMinuteRequests >= this.config.maxRequestsPerMinute) {
      throw new Error(`Minute rate limit exceeded: ${lastMinuteRequests}/${this.config.maxRequestsPerMinute}`);
    }

    return true;
  }

  /**
   * API呼び出しを記録
   */
  recordRequest(endpoint: string): void {
    this.requests.push({
      timestamp: Date.now(),
      endpoint
    });
  }

  /**
   * リトライ遅延時間を計算（指数バックオフ）
   */
  getRetryDelay(endpoint: string, attempt: number): number {
    const baseDelay = this.config.retryDelayMs;
    return Math.min(baseDelay * Math.pow(2, attempt), 30000); // 最大30秒
  }

  /**
   * リトライ実行（指数バックオフ付き）
   */
  async executeWithRetry<T>(
    endpoint: string,
    operation: () => Promise<T>,
    attempt: number = 0
  ): Promise<T> {
    try {
      // レート制限チェック
      this.canMakeRequest(endpoint);
      
      // API実行
      const result = await operation();
      
      // 成功時は記録
      this.recordRequest(endpoint);
      
      // リトライ遅延をリセット
      this.retryDelays.delete(endpoint);
      
      return result;
    } catch (error: any) {
      // リトライ可能エラーかチェック
      const isRetryableError = this.isRetryableError(error);
      
      if (!isRetryableError || attempt >= this.config.maxRetries) {
        throw error;
      }

      // 遅延後にリトライ
      const delay = this.getRetryDelay(endpoint, attempt);
      console.warn(`Retrying ${endpoint} after ${delay}ms (attempt ${attempt + 1}/${this.config.maxRetries})`);
      
      await this.sleep(delay);
      return this.executeWithRetry(endpoint, operation, attempt + 1);
    }
  }

  /**
   * リトライ可能エラーか判定
   */
  private isRetryableError(error: any): boolean {
    // HTTP 429 (Too Many Requests)
    if (error.message?.includes('429')) return true;
    
    // 一時的な認証エラー
    if (error.message?.includes('401') && error.message?.includes('temporary')) return true;
    
    // ネットワークエラー
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;
    
    // SwitchBot API の一時的エラー
    if (error.message?.includes('Internal Server Error')) return true;
    if (error.message?.includes('Service Unavailable')) return true;
    
    return false;
  }

  /**
   * スリープ関数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 統計情報取得
   */
  getStats(): {
    totalRequests: number;
    requestsLast24h: number;
    requestsLastHour: number;
    requestsLastMinute: number;
    remainingDaily: number;
  } {
    const now = Date.now();
    const last24h = this.requests.filter(
      record => now - record.timestamp < 24 * 60 * 60 * 1000
    ).length;
    const lastHour = this.requests.filter(
      record => now - record.timestamp < 60 * 60 * 1000
    ).length;
    const lastMinute = this.requests.filter(
      record => now - record.timestamp < 60 * 1000
    ).length;

    return {
      totalRequests: this.requests.length,
      requestsLast24h: last24h,
      requestsLastHour: lastHour,
      requestsLastMinute: lastMinute,
      remainingDaily: Math.max(0, this.config.maxRequestsPerDay - last24h)
    };
  }
}
