## gpt-oss × SwitchBot スマートホーム 実装計画（v0）

本計画は `doc/spec.md` を基に、OpenAI Open Model Hackathon 提出物（締切: 2025-09-11 17:00 PDT）を完成させるための実装スコープ、役割、スケジュール、品質基準、リスク対策を定義する。

### 1. ゴールとスコープ

- **ゴール**: 自然言語対話から SwitchBot Cloud API v1.1 を経由して家庭内デバイスを安全に操作し、Webhook イベントとセンサ値を用いて状況理解・自動化提案を行うデモを安定動作で完成させる。
- **MVP スコープ**
  - 会話 UI（Web; Next.js）からのデバイス操作（`turnOn/press/setMode` 等）
  - LLM（`gpt-oss-20b` をデフォルト）による harmony 形式のツール呼び出し
  - SwitchBot API v1.1 クライアント（HMAC 署名、レート監視、リトライ）
  - Webhook 受信とイベントログ表示、簡易自動化提案（LLM）
  - シーン取得/実行（最低 1 パス：取得と実行）
- **Nice to have（時間が許せば）**
  - シーン学習（頻出操作の自動シーン化）
  - 省リソースローカル実行最適化（20B ローカル/エッジ）
  - HA ブリッジ（BLE/Cloud/Matter）の PoC

### 2. 成果物と受け入れ基準（Definition of Done）

- **デモ動画（<=3min）**: 以下シナリオを 1 テイクで完遂
  - 外出モードの実行（ロック施錠・照明 OFF・カーテン閉・掃除機予約のうち 2 種以上）
  - 帰宅でドア開 Webhook → UI 反映 → LLM 提案（照明 ON 等）
- **機能要件**
  - 会話からのデバイス制御成功率（Intent 成功率） >= 90%（デモ経路）
  - 対話→操作レイテンシ p95 <= 5 秒（クラウド 20B/120B いずれか）
  - Webhook 受信→UI 反映 <= 3 秒（ローカル回線時）
  - 主要 API（`/devices`/`/status`/`/command`/`/scenes`）の統合テストがグリーン
- **非機能**
  - トークン/シークレットはサーバ側 Secret 管理（KMS/Secret Manager）
  - 危険操作（二段階確認ポリシ; 解錠は在宅・時刻など条件評価の上で最終確認）
  - 1 万/日のレート制限対策（キャッシュ・Webhook 優先・指数バックオフ・クォータ）

### 3. 体制と役割（想定）

- **Backend（Node.js/TypeScript, Fastify）**
  - SwitchBot Adapter（署名/HMAC、レート/リトライ、API ラッパ）
  - Webhook Ingest（検証・保護、イベント→ストア）
  - Chat Orchestrator（LLM ツールディスパッチ）
- **LLM/Tools**
  - harmony ツール定義、意図抽出/安全ポリシ実装、メモリ/コンテキスト管理（Backend チームが兼務）
- **Frontend（Next.js）**
  - チャット UI、デバイス/シーン一覧、イベントログ、オートメーション編集カード
- **DevOps**
  - シークレット管理、環境差分、メトリクス/ログ、CI/CD（lint/test/build）

### 4. スケジュール（ハッカソン用 Day 1–6）

- **Day 1: 基盤構築**
  - モノレポ雛形、CI（lint/test/build）、環境変数雛形 (`.env.example`)
  - SwitchBot API v1.1 クライアント雛形（署名ユーティリティ、`GET /devices` の実装）
  - gpt-oss ランタイム準備（20Bモデルで harmony I/O の疎通確認）
- **Day 2: デバイス操作とUIの連結**
  - `GET /devices/:id/status` と `POST /devices/:id/commands` を実装、単体テスト
  - Webhook エンドポイント雛形と仕様調査（署名・ヘッダ検証）
  - Next.js チャット UI の骨組みとデバイス表示カード
- **Day 3: LLM連携とE2E疎通**
  - harmony ツール定義（`get_devices`, `get_status`, `send_command` 等）
  - Chat Orchestrator を実装（tool call → Adapter 呼び出し → 応答整形）
  - E2E 疎通確認（チャット UI → LLM → SwitchBot API モック）
- **Day 4: イベント駆動と自動化**
  - Webhook 受信からイベントストア、UIへのリアルタイム反映
  - レート保護/リトライ/キャッシュ戦略の実装と適用
  - シーン取得/実行機能の実装
- **Day 5: 機能仕上げとデモ準備**
  - 簡易自動化（プロンプト+ルールベース）とシーン学習（頻出操作の候補生成）
  - ロギング、エラーハンドリング（ユーザ向け代替案提示）
  - デモ台本作成、UI/UX の仕上げ、README 文書化
- **Day 6: デモ撮影と提出**
  - 通しデモ撮影（複数テイク）、最終的な品質確認
  - Devpost 提出物の作成と最終提出

### 5. アーキテクチャと主要技術選定

- **Frontend**: Next.js 14（App Router）, React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js 20 + Fastify 4, TypeScript
- **LLM**: マルチアダプター対応（`LLMFactory` による動的切り替え）
  - `OpenAIAdapter`: OpenAI API 互換（開発/テスト用）
  - `OllamaAdapter`: ローカル推論（gpt-oss-20b）
  - `GPTOSSAdapter`: gpt-oss ネイティブ harmony 形式（本番推奨）
- **Data Store**: SQLite/Prisma（ローカル簡易）または Postgres（クラウド）
- **Queue/Stream（任意）**: lightweight（内蔵 queue or Redis）
- **Observability**: pino + OpenTelemetry（最低限のトレース/メトリクス）
- **ワークフローエンジン**: WorkflowParser + ConditionEvaluator + AutomationScheduler

#### 推奨ディレクトリ構成（モノレポ）

```
apps/
  web/                # Next.js
  api/                # Backend（LLM/Adapter/API）
packages/
  switchbot-adapter/  # SwitchBot API クライアント（署名、API コール、レート制御）
  harmony-tools/      # LLM に渡す harmony ツールスキーマ定義と、その TypeScript 型定義
  shared/             # API の Request/Response 型、データモデルの型など、`api` と `web` で共有されるリソース
```

### 6. API 設計（抜粋）

#### 6.1 チャット/デバイス操作 API

```
POST /api/chat
  body: { messages: [...], toolsAllowed: true }
  res:  { reply, toolCalls: [...] }

GET  /api/switchbot/devices
GET  /api/switchbot/devices/:id/status
POST /api/switchbot/command
  body: { deviceId, command, parameter?, commandType? }
  res:  { requestId, statusCode, message }

POST /api/webhooks/switchbot
  body: { deviceType, eventType, payload... }  // v1.1 準拠
```

#### 6.2 自動化ワークフロー API（実装済み）

```
POST /api/automation/workflow/parse         // 自然言語→ルール変換
POST /api/automation/workflow/save          // ルール保存
GET  /api/automation/workflow/rules         // ルール一覧
GET  /api/automation/workflow/rules/:ruleId // ルール取得
PUT  /api/automation/workflow/rules/:ruleId // ルール更新
DELETE /api/automation/workflow/rules/:ruleId // ルール削除
PATCH /api/automation/workflow/rules/:ruleId/toggle  // 有効/無効切替
POST /api/automation/workflow/rules/:ruleId/execute  // 手動実行
GET  /api/automation/workflow/rules/:ruleId/history  // 実行履歴
POST /api/automation/workflow/conditions/evaluate    // 条件テスト
```

#### 6.3 自動化提案/シーン学習 API（実装済み）

```
POST /api/automation/proposals              // 自動化提案生成
POST /api/automation/proposals/validate     // 提案検証
POST /api/scenes/learn/record              // 操作記録
GET  /api/scenes/learn/patterns            // パターン取得
POST /api/scenes/learn/candidates          // シーン候補生成
```

### 7. データモデル（最小）

- `Device` { id, type, name, room?, capabilities[], lastStatus?, updatedAt }
- `Scene` { id, name, actions[], createdAt }
- `Event` { id, deviceId, deviceType, eventType, payload, receivedAt }
- `UserSetting` { id, targetIlluminance?, sleepSchedule?, presence? }
- `AutomationRule` { id, name, description, isEnabled, conditions[], actions[], schedule?, userId, executionCount, lastExecuted? }
- `RuleCondition` { type, operator, value, deviceId?, tolerance? }
- `RuleAction` { type, deviceId?, command?, parameters?, sceneId?, message?, delay? }
- `RuleExecution` { id, ruleId, executedAt, status, results[], conditions[] }
- `OperationRecord` { deviceId, command, parameters, timestamp, userId }
- `SceneCandidate` { name, operations[], confidence, frequency, patternType }
- `LearnedScene` { id, name, operations[], confidence, isAutoGenerated, usageCount }

### 8. SwitchBot Adapter 仕様

- **認証/署名**: `Authorization: <token>`, `sign: base64(HMAC_SHA256(secret, token + t + nonce))`, `t: 13 桁`, `nonce`
- **エンドポイント**
  - `GET /v1.1/devices`
  - `GET /v1.1/devices/{id}/status`
  - `POST /v1.1/devices/{id}/commands`
  - `GET/POST /v1.1/scenes`
- **レート/信頼性**
  - 日次 1 万回上限に対するクォータ（ユーザ・デバイス・ルートごと）
  - キャッシュ: `devices`（10–30 分）, `status`（短期; 5–30 秒, UI の明示更新で無効化）
  - リトライ: 指数バックオフ（`429`, 一時的 `401`）

### 9. harmony ツール定義（最小）

```json
{
  "tools": [
    {
      "name": "get_devices",
      "description": "List devices",
      "input_schema": {
        "type": "object",
        "properties": {},
        "additionalProperties": false
      }
    },
    {
      "name": "get_status",
      "description": "Get device status",
      "input_schema": {
        "type": "object",
        "properties": { "deviceId": { "type": "string" } },
        "required": ["deviceId"],
        "additionalProperties": false
      }
    },
    {
      "name": "send_command",
      "description": "Send command to device",
      "input_schema": {
        "type": "object",
        "properties": {
          "deviceId": { "type": "string" },
          "command": { "type": "string" },
          "parameter": { "type": ["string", "object", "null"] },
          "commandType": { "type": ["string", "null"] }
        },
        "required": ["deviceId", "command"],
        "additionalProperties": false
      }
    },
    {
      "name": "get_scenes",
      "description": "List scenes",
      "input_schema": {
        "type": "object",
        "properties": {},
        "additionalProperties": false
      }
    },
    {
      "name": "exec_scene",
      "description": "Execute scene",
      "input_schema": {
        "type": "object",
        "properties": { "sceneId": { "type": "string" } },
        "required": ["sceneId"],
        "additionalProperties": false
      }
    }
  ]
}
```

### 10. セキュリティ/プライバシ

- サーバ側で Secrets 保持（KMS/Secret Manager）。クライアントへは一切出さない。
- Webhook は検証トークン + IP 許可制（可能なら）+ リプレイ防止（`t`/`nonce`/署名の検証）
- 危険コマンド（二段階確認）とルール: 深夜の解錠は無効化 or 家族確認通知
- ログの個人情報最小化、イベントの保存期間を短期に設定

### 11. レート保護/信頼性

- クォータ: ユーザ/デバイス別、バケット化（例: 1 分/1 時間の上限）
- キャッシュ: `/devices` は長め、`/status` は短期・明示更新でバイパス
- バルク操作のバッチング、ツール側の冪等化（同一要求の重複防止）

### 12. 観測性/運用

- 構造化ログ（pino）: `requestId`, `deviceId`, `command`, `latencyMs`, `status`
- メトリクス: 意図成功率、ツール実行成功率/レイテンシ p50/p95、Webhook→UI 反映時間
- エラー分類: 4xx/5xx/外部 API/LLM 失敗/レート上限

### 13. テスト計画

- 単体: 署名ユーティリティ（公式例と一致）、ツール入出力バリデーション
- 統合: `/devices`/`/status`/`/command`/`/scenes` のモック/サンドボックスでの往復
- E2E: 会話 → ツール → SwitchBot モック → 応答生成（UI と合わせたスモーク）
- 負荷: 連続コマンド時のレート/バックオフ挙動確認

### 14. デモ準備

- シナリオ固め（外出モード、帰宅→提案）
- 動作が安定するデバイス構成の固定、通信環境の確認
- UI の視認性（カード/ログ/トースト）、録画リハーサル

### 15. リスクと対策

- SwitchBot 側のレート/一時障害: キャッシュ/バッファ、代替案提示
- LLM 応答ブレ: システムプロンプトのガード、ツール優先方針、温度低設定
- Webhook 遅延: 可能な限りローカル近接配置、UI 側の到着待ち表示
- 120B 推論コスト/可用性: 20B をデフォルトにし、性能要所のみ 120B に差し替え

#### 未対応事項・技術債務

##### ✅ 解決済み

- **CIテストエラーの修正完了**: `condition-evaluator.test.ts`のモック設定を既存パターンに統一。ワークフロー機能のテストカバレッジが完全に動作。

- **Day 5完了**: 自動化提案（`AutomationProposalService`）とシーン学習（`SceneLearningService`）の実装完了。ワークフローエンジン（`WorkflowParser` + `ConditionEvaluator` + `AutomationScheduler`）も実装済み。API テスト 61/61 成功。

##### 🔧 対応予定

- ~~**固定プロンプトの問題**: ChatOrchestrator のシステムメッセージがハードコード~~ → **解決済み**
  - `generateSystemMessage()` で SwitchBot API から動的デバイス情報を取得
  - `apps/api/src/config/system-prompts.ts` にプロンプトテンプレート外部化
  - 環境変数 `RESTRICTED_DEVICES`, `SYSTEM_PROMPT_CUSTOM_INSTRUCTIONS` で設定可能
  - デバイス取得失敗時は `FALLBACK_SYSTEM_PROMPT` にフォールバック
  - プロンプトキャッシュ（デフォルト10分TTL）でAPI呼び出し最小化

- **ESLint設定の完全修正**: API アプリの ESLint TypeScript 設定が一時的にスキップ状態
  - 対策: TypeScript ESLint プラグインの依存関係修正
  - 優先度: Day 6以降

- **Webテストの一時スキップ**: DeviceCard の `onCommand` コールバック引数不一致
  - `Expected: "device-1", "turnOn"` vs `Received: "device-1", "turnOn", undefined`
  - 対策: DeviceCard コンポーネントまたはテストの引数仕様統一
  - 優先度: Day 6以降

- **Web typecheck の一時スキップ**: Jest/DOM 型定義の問題
  - 優先度: Day 6以降

##### 📋 新規追加事項（spec.md 改訂に伴う）

- **リアルタイム通信（SSE/WebSocket）**: Webhook イベントのフロントエンドへの即時配信
- **デバイスグルーピング/ルーム管理**: 部屋単位のデバイス操作対応
- **操作監査ログ**: セキュリティ重要操作の全アクション記録
- **マルチユーザ対応**: 家族メンバーごとの権限管理
- **音声入力統合**: Web Speech API / Whisper 対応
- **操作ダッシュボード**: デバイス操作頻度、自動化統計の可視化

### 16. 開発環境/セットアップ

- 前提
  - Node.js 20 / npm or pnpm、（Python 3.11 + uv/poetry は選択制）
  - gpt-oss 実行環境（20B ローカル or クラウド GPU）
- 環境変数（例）
  - `SWITCHBOT_TOKEN`, `SWITCHBOT_SECRET`
  - `SWITCHBOT_WEBHOOK_VERIFY_TOKEN`
  - `LLM_BASE_URL`, `LLM_MODEL=gpt-oss-20b`, `LLM_API_KEY`（必要時）
- ローカル起動
  - API: `pnpm --filter api dev`（または `uv run fastapi dev`）
  - Web: `pnpm --filter web dev`

### 17. タスク分解（追跡用チェックリスト）

本計画は `doc/spec.md` を技術的・戦術的に分解したものです。

#### 基盤・インフラ

- [x] モノレポ雛形、CI（lint/test/build）
- [x] Secrets 設計、環境変数雛形 (`.env.example`)

#### SwitchBot API 連携

- [x] SwitchBot 署名ユーティリティ + 単体テスト
- [x] Webhook 仕様調査（署名・ヘッダ検証）
- [x] `GET /devices` 実装 + 統合テスト
- [x] `GET /devices/:id/status` 実装 + 統合テスト
- [x] `POST /devices/:id/commands` 実装 + 統合テスト
- [x] `GET/POST /scenes`（取得/実行）
- [x] レート保護/リトライ/キャッシュ
- [x] Webhook 受信・検証・イベント保存

#### LLM 連携

- [x] harmony ツール定義とツールディスパッチ
- [x] マルチ LLM アダプター（OpenAI/Ollama/gpt-oss）
- [x] 動的システムプロンプト生成（デバイス情報の自動反映）
- [x] プロンプトテンプレート外部化（`config/system-prompts.ts`）

#### ワークフローエンジン（自動化基盤）

- [x] 自然言語ワークフローパーサー（LLM + フォールバック）
- [x] 条件評価エンジン（time/temperature/humidity/device_state）
- [x] 自動化スケジューラー（daily/weekly/interval/once）
- [x] 自動化ワークフロー CRUD API

#### 自動化・シーン学習

- [x] 自動化提案（ルール + プロンプト）
- [x] シーン学習（頻出操作の自動シーン化）
- [x] パターン検出（順次/時間/頻出操作）

#### フロントエンド

- [x] チャット UI（メッセージ、デバイスカード、ツール可視化、結果リフィード）
- [x] ワークフロー作成・管理 UI
- [ ] リアルタイムイベント反映（SSE/WebSocket）
- [ ] デバイスグルーピング/ルーム管理 UI

#### 品質・運用

- [ ] ESLint 設定の完全修正（API アプリ）
- [ ] Web テストの修正（DeviceCard パラメータ期待値）
- [ ] Web typecheck の修正（Jest/DOM 型定義）
- [x] リアルタイム通信（SSE）のバックエンド実装（SSE ルート、NotificationService、Webhook 連携）
- [ ] E2E テストの拡充（SSE 疎通、自動化ワークフロー、シーン学習）
- [ ] ログ/メトリクス/ダッシュボード（最小）
- [ ] 操作監査ログの実装

#### デモ・提出

- [ ] デモシナリオ・README・動画

### 18. E2E テスト拡張計画（新規追加）

実装済みの機能を網羅するため、以下の E2E シナリオを追加する。

#### 18.1 SSE リアルタイムイベント
- **シナリオ**: Webhook 受信が SSE クライアントに即時配信されることを確認
- **検証項目**: `/api/events` 接続維持、`/api/webhooks/switchbot` への POST、SSE クライアントでのイベント受信

#### 18.2 自動化ワークフロー・ライフサイクル
- **シナリオ**: 自然言語からのルール作成・保存・実行・履歴確認の全工程を確認
- **検証項目**: `/workflow/parse` (LLM/Fallback) -> `/workflow/save` -> `/workflow/rules` (一覧) -> `/workflow/rules/:id/execute` -> `/workflow/rules/:id/history`

#### 18.3 シーン学習統合
- **シナリオ**: 連続した操作記録からシーン候補が生成されることを確認
- **検証項目**: `/scenes/record` (複数回) -> `/scenes/patterns` -> `/scenes/candidates` (信頼度付き候補)

#### 18.4 セキュリティ・異常系
- **シナリオ**: 不正な署名や無効なパラメータの拒絶を確認
- **検証項目**: Webhook 署名検証失敗 (401)、不正なツールパラメータ (400)、存在しないデバイスへの操作

### 19. 参照リンク

- `doc/spec.md` を参照。
