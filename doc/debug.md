# SwitchBot実機デバッグガイド

本ドキュメントは `doc/plan.md` および `doc/spec.md` に基づき、SwitchBot実機を使用したデバッグのタイミング、手法、準備事項を定義します。

## 1. デバッグタイムライン

### 📅 **Day 2: 初回実機接続（基本API疎通）**
- **タイミング**: SwitchBot APIクライアント実装完了後
- **対象機能**: 
  - `GET /v1.1/devices` - デバイス一覧取得
  - `GET /v1.1/devices/{id}/status` - デバイス状態取得
  - `POST /v1.1/devices/{id}/commands` - 基本コマンド実行
- **テスト対象デバイス**: 照明、プラグ等の安全なデバイス
- **成功基準**: HMAC署名認証成功、基本コマンド実行成功

### 📅 **Day 3: LLM連携実機テスト（E2E疎通）**
- **タイミング**: Chat Orchestrator + harmony ツール定義完了後
- **対象機能**:
  - チャットUI → LLM → SwitchBot API の完全なフロー
  - harmony ツールからの実機制御
- **テストシナリオ**: 「照明をつけて」→ LLM → 実機操作
- **成功基準**: 自然言語入力から実機操作まで5秒以内で完了

### 📅 **Day 4: Webhook実機テスト（イベント駆動）**
- **タイミング**: Webhook受信エンドポイント実装完了後
- **対象機能**:
  - 実機からのWebhookイベント受信
  - リアルタイムUI反映
  - シーン取得/実行
- **テスト対象**: ドア開閉、モーションセンサー、温湿度センサー
- **成功基準**: イベント発生からUI反映まで3秒以内

### 📅 **Day 5-6: デモシナリオ実機テスト**
- **タイミング**: 全機能実装完了後
- **対象機能**: 完全なデモフローの実機動作確認
- **テストシナリオ**:
  1. 「外出モード」実行（ロック施錠・照明OFF・カーテン閉・掃除機予約）
  2. 帰宅時のドア開Webhook → UI反映 → LLM提案
- **成功基準**: デモシナリオを1テイクで完遂

## 2. 実機準備・セットアップ

### 🔧 **必要なSwitchBotデバイス**

#### **最小構成（MVP用）**
- [ ] **Hub Mini** - Webhook受信とクラウド連携の中心
- [ ] **スマートプラグ** - 安全な制御テスト用
- [ ] **カーテン** - 視覚的効果の高いデモ用
- [ ] **温湿度計** - センサーデータ取得テスト用

#### **デモ推奨構成**
- [ ] **スマートロック** - 「外出モード」のメイン機能
- [ ] **照明系デバイス** - シーン制御のベース
- [ ] **開閉センサー** - Webhookイベント生成用
- [ ] **モーションセンサー** - 帰宅検知用
- [ ] **ロボット掃除機** - 自動化デモ用

### 🔑 **認証情報の準備**

#### **必要な環境変数**
```bash
# SwitchBot API認証
SWITCHBOT_TOKEN=your_token_here
SWITCHBOT_SECRET=your_secret_here

# Webhook検証
SWITCHBOT_WEBHOOK_VERIFY_TOKEN=your_webhook_token

# LLM設定
LLM_BASE_URL=your_gpt_oss_endpoint
LLM_MODEL=gpt-oss-20b
LLM_API_KEY=your_api_key_if_needed
```

#### **取得手順**
1. SwitchBotアプリ → プロフィール → 設定 → アプリバージョン
2. アプリバージョンを10回タップして開発者モードを有効化
3. デベロッパーオプション → トークンを取得
4. Webhook URLの登録（ngrok等でローカル公開）

### 🌐 **ネットワーク・接続設定**

#### **ローカル開発環境**
```bash
# APIサーバー
pnpm --filter api dev  # localhost:3001

# Webフロントエンド  
pnpm --filter web dev  # localhost:3000

# Webhook受信用（ngrok等）
ngrok http 3001  # 例: https://abcd1234.ngrok.io
```

#### **Webhook URL設定**
- **登録URL**: `https://your-domain.ngrok.io/api/webhooks/switchbot`
- **検証**: ngrokダッシュボードでHTTPリクエストを監視

## 3. デバッグ手法・ツール

### 🔍 **段階的デバッグアプローチ**

#### **Phase 1: 認証・基本API**
```bash
# 署名生成テスト
curl -X GET "https://api.switch-bot.com/v1.1/devices" \
  -H "Authorization: Bearer $SWITCHBOT_TOKEN" \
  -H "sign: $GENERATED_SIGNATURE" \
  -H "t: $TIMESTAMP" \
  -H "nonce: $NONCE"
```

#### **Phase 2: デバイス操作**
```bash
# 安全なデバイス（プラグ）でテスト
curl -X POST "https://api.switch-bot.com/v1.1/devices/{device-id}/commands" \
  -H "Content-Type: application/json" \
  -d '{"command": "turnOn", "parameter": "default"}'
```

#### **Phase 3: Webhook受信**
```bash
# ngrokでWebhook受信を監視
curl http://localhost:4040/api/requests/http  # ngrok管理画面API
```

### 📊 **ログ・監視設定**

#### **構造化ログ（pino）**
```javascript
// 必須ログフィールド
{
  "requestId": "uuid",
  "deviceId": "device-123", 
  "command": "turnOn",
  "latencyMs": 1500,
  "status": "success|failure",
  "timestamp": "2025-01-XX",
  "source": "api|webhook|llm"
}
```

#### **メトリクス監視**
- **API成功率**: SwitchBot API呼び出しの成功/失敗率
- **レスポンス時間**: p50/p95のレイテンシ監視
- **レート制限**: 日次使用量（10,000回/日の監視）
- **Webhook配信**: イベント受信からUI反映までの時間

### 🛠 **デバッグツール・ユーティリティ**

#### **HMAC署名検証ツール**
```typescript
// apps/api/src/utils/signature-debug.ts
export function validateSignature(
  token: string,
  secret: string,
  timestamp: string,
  nonce: string,
  expectedSignature: string
): boolean {
  const stringToSign = token + timestamp + nonce;
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(stringToSign)
    .digest('base64');
  
  console.log('Debug:', {
    stringToSign,
    computedSignature,
    expectedSignature,
    matches: computedSignature === expectedSignature
  });
  
  return computedSignature === expectedSignature;
}
```

#### **レート制限監視**
```typescript
// packages/switchbot-adapter/src/rate-limiter.ts
export class RateLimiter {
  private dailyCount = 0;
  private lastReset = new Date().toDateString();
  
  checkLimit(): boolean {
    const today = new Date().toDateString();
    if (today !== this.lastReset) {
      this.dailyCount = 0;
      this.lastReset = today;
    }
    
    if (this.dailyCount >= 9000) { // 安全マージン
      console.warn(`Rate limit approaching: ${this.dailyCount}/10000`);
      return false;
    }
    
    this.dailyCount++;
    return true;
  }
}
```

## 4. トラブルシューティング

### ❌ **よくある問題と対策**

#### **認証エラー (401 Unauthorized)**
```bash
# 問題: HMAC署名の生成ミス
# 対策: 署名生成ロジックの確認
echo "Debug: token=$TOKEN, t=$TIMESTAMP, nonce=$NONCE"
echo "StringToSign: $TOKEN$TIMESTAMP$NONCE"
```

#### **レート制限エラー (429 Too Many Requests)**
```javascript
// 対策: 指数バックオフとキャッシュ活用
async function retryWithBackoff(apiCall, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (error.status === 429) {
        const delay = Math.pow(2, i) * 1000; // 1秒, 2秒, 4秒
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

#### **Webhook受信エラー**
```bash
# 問題: ngrokトンネル切断、検証トークン不一致
# 対策: ngrok状態確認とトークン再設定
curl https://api.ngrok.com/tunnels  # ngrok API
```

#### **LLM応答ブレ**
```javascript
// 対策: 温度設定とシステムプロンプト強化
const llmConfig = {
  temperature: 0.1,  // 低温度で一貫性向上
  systemPrompt: `あなたは家電制御の専門家です。
安全性を最優先し、曖昧な指示には必ず確認を求めてください。
危険な操作（深夜の解錠等）は条件を評価してから実行してください。`
};
```

### 🚨 **緊急時対応**

#### **実機の安全停止**
```bash
# 全デバイスの緊急停止
curl -X POST "$API_BASE/emergency-stop" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

#### **API制限回復待ち**
```bash
# レート制限リセット（翌日0:00 UTC）
echo "Rate limit resets at: $(date -d 'tomorrow 00:00 UTC')"
```

## 5. デバッグチェックリスト

### ✅ **Day 2: API基本動作確認**
- [ ] SwitchBot API認証成功（HMAC署名検証）
- [ ] デバイス一覧取得成功
- [ ] 安全デバイス（プラグ等）の基本操作成功
- [ ] エラーハンドリング動作確認
- [ ] レート制限カウンタ動作確認

### ✅ **Day 3: LLM連携確認**
- [ ] チャットUI → LLM → 実機の完全フロー成功
- [ ] harmony ツールからの制御成功
- [ ] 自然言語意図抽出の精度確認
- [ ] エラー時の代替案提示機能確認

### ✅ **Day 4: Webhook・イベント確認**
- [ ] 実機からのWebhook受信成功
- [ ] イベント検証（署名・タイムスタンプ）成功
- [ ] リアルタイムUI反映確認
- [ ] シーン取得・実行成功

### ✅ **Day 5-6: デモ動作確認**
- [ ] 「外出モード」完全動作
- [ ] 帰宅Webhook → 提案の完全フロー
- [ ] デモ撮影環境での安定動作
- [ ] 想定レイテンシ以内での動作（対話→操作 <= 5秒）

## 6. デモ撮影準備

### 🎬 **撮影環境セットアップ**
- [ ] 安定したWiFi接続環境
- [ ] デバイス配置の最適化（視認性重視）
- [ ] 照明・カメラアングル調整
- [ ] 音声収録設定（マイク・ノイズ対策）

### 📝 **撮影台本**
```
1. オープニング（10秒）
   「こんにちは。gpt-ossとSwitchBotを使ったスマートホーム制御デモです」

2. 外出モードデモ（60秒）
   「外出します」→ LLM実行 → 複数デバイス連携動作

3. 帰宅・自動提案デモ（60秒）  
   ドア開Webhook → UI反映 → LLM提案 → 受諾・実行

4. クロージング（30秒）
   技術ポイント説明・今後の展望
```

### ⚠️ **撮影時の注意点**
- デバイス応答の待ち時間を考慮した台本作成
- 失敗時のリカバリプラン準備
- 複数テイク撮影での電池・接続状態管理
- SwitchBot APIのレート制限を考慮したリハーサル回数制限

---

## 参考リンク

- `doc/plan.md` - 実装計画とスケジュール
- `doc/spec.md` - 技術仕様とアーキテクチャ
- [SwitchBot API v1.1 Documentation](https://github.com/OpenWonderLabs/SwitchBotAPI)
- [gpt-oss harmony format](https://github.com/openai/harmony)

---

*このドキュメントは実機デバッグの進捗に応じて随時更新してください。*
