たくろうさん、要点から。

* SwitchBotは**公式Cloud API v1.1**があり、**トークン+シークレット+HMAC署名**で認証、**1万回/日**のAPI制限があります。([GitHub][1])
* ハッカソンは**OpenAI Open Model Hackathon（Devpost）**。gpt-oss を使うことが条件。締切は **2025-09-11 17:00 PDT**。([OpenAI Open Model Hackathon][2])
* gpt-oss は **20B/120B** のオープンウェイト。**harmony 形式**で使うのが推奨（必須）。20Bは**\~16GBメモリでも可**、120Bは**80GB GPU**想定（MXFP4量子化）。([GitHub][3], [OpenAI][4])
* Home Assistant 連携は **BLE / Cloud / Matter** の3方式が公式に案内されています（任意）。([blog.switch-bot.com][5], [Home Assistant][6])

---

# gpt-oss × SwitchBot スマートホーム：ハッカソン提出用 仕様書

## 1. プロダクト概要

**製品名（仮）**：RoomSense GPT
**一言**：自然言語で「家の状況を理解→最適なアクションを実行」するLLMスマートホーム。
**主機能**

1. 会話で家電・鍵・照明などを操作（SwitchBot Cloud API）。
2. センサ値やWebhooksをLLMに要約→状況に応じた自動化を提案/実行。
3. 省リソース構成（gpt-oss-20b ローカル/エッジ）またはクラウドGPUで高精度（gpt-oss-120b）。([GitHub][1], [OpenAI][4])

## 2. ユースケース

* 「暑いから涼しくして」→ 室温/湿度/CO2を読み取り、サーキュレータ+エアコンの運転を最適化し、扇風機の強弱・角度も制御。([GitHub][1])
* 「外出モード」→ ドアロック、照明OFF、カーテン閉、ロボ掃除機を予約、異常検知をWebhook監視。([GitHub][1])
* 「夜の読書モード」→ 目標照度を満たすシーンを提案・保存（照明とブラインド tilt）。([GitHub][1])

## 3. アーキテクチャ

* **フロント**：Web（Next.js）/モバイル（Expo）チャットUI＋カード型オートメーション編集。
* **バックエンド**：

  * **LLM サービス**：gpt-oss 推論（20BはローカルGPU/CPU、120BはA100/H100等）。**harmonyフォーマット**でツール呼び出し。([GitHub][7])
  * **Smart Home Adapter**：SwitchBot Cloud API v1.1 クライアント（署名生成、レート監視、リトライ）。([GitHub][1])
  * **Event Ingest**：SwitchBot Webhook 受信（ドア/モーション/リーク等）→MQ/ストリーム→LLMにコンテキスト投入。([GitHub][1])
  * **（任意）HAブリッジ**：Home Assistant へは BLE/Cloud/Matter でデバイス反映。([blog.switch-bot.com][5], [Home Assistant][6])
* **データストア**：ユーザ設定、シーン、デバイスキャッシュ、イベントログ。

### シーケンス（例：音声→家電制御）

1. ユーザ発話 → ASR → LLM
2. LLMが**harmonyのtool**出力で `switchbot.command()` を指示
3. Adapterが `/v1.1/devices/{id}/commands` をHMAC署名付きでPOST
4. 結果をLLMへリフィードし応答生成（失敗時は代替案提示）([GitHub][1])

## 4. 主要技術仕様

### 4.1 LLM（マルチアダプター対応）

* **モデル選択**

  * デフォルト：`gpt-oss-20b`（16GBクラスで動作可）
  * 高精度：`gpt-oss-120b`（80GB GPUで単機稼働、MXFP4量子化）([GitHub][3])
* **マルチLLMアダプター**：環境や要件に応じてプロバイダを切り替え可能
  * `OpenAIAdapter`：OpenAI API 互換（gpt-4o-mini 等）。開発/テスト用、およびクラウド環境向け。
  * `OllamaAdapter`：Ollama ローカル推論。`gpt-oss-20b` のローカル実行に使用。
  * `GPTOSSAdapter`：gpt-oss ネイティブ API（harmony 形式対応）。本番推奨。
  * `LLMFactory`：環境変数 `LLM_PROVIDER` により動的にアダプターを生成。
* **I/O形式**：OpenAI **harmony**（マルチチャネル出力、ツールコール前提）([GitHub][7])
* **プロンプト戦略**

  * システム：家電ドメインの**ポリシー**（安全・許可・確認）
  * ツール：`get_devices`, `get_status`, `send_command`, `get_scenes`, `exec_scene`
  * メモリ：最近の環境値（温湿度/在宅/時刻/就寝スケジュール）
* **フォールバック戦略**：LLM が利用不可の場合、パターンマッチングベースの解析にフォールバック（WorkflowParser 等）

### 4.2 SwitchBot API v1.1

* **認証**：`Authorization`（トークン）+ `sign`（HMAC-SHA256）+ `t`（13桁）+ `nonce`。([GitHub][1])
* **レート制限**：**10,000回/日**（超過でUnauthorized）。([GitHub][1])
* **主要エンドポイント**

  * `GET /v1.1/devices`（一覧）
  * `GET /v1.1/devices/{id}/status`（状態）
  * `POST /v1.1/devices/{id}/commands`（操作：turnOn/press/setMode…）
  * `GET/POST /v1.1/scenes`（シーン取得/実行）
  * **Webhook**：登録/取得/更新/削除 + 多数デバイスのイベント配信。([GitHub][1])

### 4.3 Home Assistant（任意）

* **方式**：BLE / Cloud / Matter（SwitchBot公式案内 & HA公式）。([blog.switch-bot.com][5], [Home Assistant][6])
* **Matter**：HAのMatterサーバと連携可能（将来の拡張性）。([Home Assistant][8])

## 5. API（自作バックエンド）の設計（抜粋）

### 5.1 チャット/デバイス操作 API

```
POST /api/chat
  body: { messages: [...], toolsAllowed: true }
  res:  { reply, toolCalls: [...] }

POST /api/switchbot/command
  body: { deviceId, command, parameter?, commandType? }
  res:  { requestId, statusCode, message }

GET  /api/switchbot/devices
GET  /api/switchbot/devices/:id/status

POST /api/webhooks/switchbot  // 受信エンドポイント
  body: { deviceType, eventType, payload... }  // v1.1仕様に準拠
```

* **署名生成**：`sign = base64(HMAC_SHA256(secret, token + t + nonce))`（公式例に準拠）。([GitHub][1])

### 5.2 自動化ワークフロー API

```
POST /api/automation/workflow/parse
  body: { naturalLanguage: string, userId?: string }
  res:  { success, workflow: AutomationWorkflow, message }

POST /api/automation/workflow/save
  body: { workflow: AutomationWorkflow }
  res:  { success, rule: AutomationRule, message }

GET  /api/automation/workflow/rules
  res:  { success, rules: AutomationRule[], count }

GET  /api/automation/workflow/rules/:ruleId
PUT  /api/automation/workflow/rules/:ruleId
DELETE /api/automation/workflow/rules/:ruleId

PATCH /api/automation/workflow/rules/:ruleId/toggle
  body: { enabled: boolean }

POST /api/automation/workflow/rules/:ruleId/execute    // 手動実行
GET  /api/automation/workflow/rules/:ruleId/history     // 実行履歴

POST /api/automation/workflow/conditions/evaluate       // 条件テスト
  body: { conditions: RuleCondition[] }
```

### 5.3 自動化提案/シーン学習 API

```
POST /api/automation/proposals
  body: { events: AutomationEvent[] }
  res:  { proposals: AutomationProposal }

POST /api/automation/proposals/validate
  body: { suggestion: AutomationSuggestion }
  res:  { validation: ProposalValidation }

POST /api/scenes/learn/record
  body: { operation: OperationRecord }

GET  /api/scenes/learn/patterns
  res:  { patterns: OperationPattern[] }

POST /api/scenes/learn/candidates
  body: { context: SceneLearningContext }
  res:  { candidates: SceneCandidate[] }
```

## 6. ワークフローエンジン（自動化基盤）

本システムの中核機能として、自然言語から自動化ルールを生成・実行するワークフローエンジンを備える。

### 6.1 自然言語ワークフローパーサー（WorkflowParser）

* **LLM 解析モード**：自然言語入力を LLM に渡し、構造化された `AutomationRule`（条件・アクション・スケジュール）を JSON で取得。温度 0.1 で安定した出力を得る。
* **フォールバック解析**：LLM 不可時はパターンマッチングで解析（時刻表現「朝/昼/夕方/夜」、温度条件「暑かったら/寒かったら」、アクション「エアコンつけて/消して」等）。
* **信頼度スコア**：条件・アクション・スケジュールの解析成功度から 0.0–1.0 の信頼度を算出。LLM 解析成功時は 0.9。
* **改善提案**：解析結果に不足がある場合、ユーザへの改善提案を自動生成（例：「エアコンの設定温度も指定すると効果的です」）。

### 6.2 条件評価エンジン（ConditionEvaluator）

以下の条件タイプをリアルタイムに評価：

| 条件タイプ | 説明 | データソース |
|---|---|---|
| `time` | 時刻条件（一致・範囲・前後） | システム時刻 |
| `temperature` | 温度条件（閾値・範囲） | SwitchBot 温湿度計 |
| `humidity` | 湿度条件（閾値・範囲） | SwitchBot 温湿度計 |
| `device_state` | デバイス状態条件 | SwitchBot API `/status` |

* 各条件に**許容誤差（tolerance）**を設定可能（温度 ±0.5°C、時刻 ±2分 等）。
* 複数条件は AND 評価（すべて満たされた場合のみアクション実行）。

### 6.3 自動化スケジューラー（AutomationScheduler）

* **スケジュールタイプ**：`once`（一度きり）、`daily`（毎日）、`weekly`（週次）、`interval`（N分間隔）
* **実行フロー**：スケジュール条件チェック → 条件評価 → アクション実行（デバイス制御/シーン実行/通知）
* **遅延実行**：アクション単位で遅延（delay秒）設定可能
* **実行履歴**：ルールごとに最大50件の実行履歴を保持（ステータス: success/failure/partial）
* **冪等性**：同一ルールの重複実行を防止

### 6.4 自動化提案サービス（AutomationProposal）

* **ルールベース提案**：時間帯・デバイスタイプ・センサー閾値に基づく自動化を提案
* **カテゴリ**：照明（lighting）、空調（climate）、セキュリティ（security）、快適性（comfort）、省エネ（energy）

### 6.5 シーン学習サービス（SceneLearning）

* **パターン検出**：
  * 順次操作パターン（短時間内に連続実行されるコマンド群）
  * 時間ベースパターン（特定時間帯に繰り返される操作）
  * 頻出操作パターン（高頻度で実行されるコマンド）
* **シーン候補生成**：検出パターンから信頼度付きシーン候補を自動生成
* **学習済みシーン管理**：ユーザ承認後、自動生成シーンとして保存・実行

## 7. リアルタイム通信

* **Webhook → UI 反映**：SwitchBot Webhook イベントをバックエンドで受信後、接続中のフロントエンドへ即時配信。
* **方式**：SSE（Server-Sent Events）を優先採用（シンプルかつ HTTP/2 互換）。将来的に WebSocket への移行も可能。
* **対象イベント**：デバイス状態変更、センサー閾値超過、ドア開閉、モーション検知、水漏れ検知。
* **目標遅延**：Webhook 受信 → UI 反映 ≤ 3秒（ローカル回線時）。

## 8. エラーハンドリング/グレースフルデグラデーション

* **LLM 障害時**：パターンマッチング解析へフォールバック、直接デバイス操作 UI を提供。
* **SwitchBot API 障害時**：キャッシュされた最新状態を表示、操作はキューイングして API 復旧後にリトライ。
* **ネットワーク障害時**：ローカルキャッシュでの表示継続、オフラインバナー表示。
* **エラー分類と応答**：
  * `4xx`：ユーザへの具体的なエラー表示と修正ガイド
  * `5xx`：自動リトライ + ユーザへの代替案提示
  * レート制限（`429`/`401`）：指数バックオフ + クォータ残量通知

## 9. セキュリティ/プライバシ

* SwitchBot **トークン/シークレットはKMS/Secret Manager**で保護、サーバ側のみ保持。
* 危険コマンドは**二段階確認**（例：鍵の解錠は在宅・時刻・ジオフェンス条件をLLMで評価→最後にユーザ確認）。
* Webhookは**検証トークン**と**IP許可**で保護。
* **操作監査ログ**：セキュリティ重要操作（解錠、シーン作成・実行、自動化ルール変更）の全アクションを `requestId`, `userId`, `deviceId`, `command`, `timestamp` 付きで記録。
* **Webhook リプレイ防止**：`t`/`nonce`/署名の検証に加え、受信済み nonce の一定期間キャッシュで重複配信を排除。

## 10. 信頼性・スロットリング

* **レート保護**：ユーザ毎・デバイス毎のクォータ、バッチ化、状態キャッシュ（`/status`のポーリング最小化）。**1万/日**の制限に対して、PullよりWebhook優先。([GitHub][1])
* リトライは指数バックオフ、429/401時の再試行ポリシー（トークン再生成）。

## 11. 評価指標（デモ審査向け）

* **Intent成功率**（正しく家電を操作できた割合）
* **対話→操作レイテンシ**（p50/p95）
* **イベント追従性**（WebhookからUI反映までの遅延）
* **シーン推薦の受容率**（ユーザが採用した割合）

## 12. 実装計画（ハッカソン向けスプリント）

`doc/plan.md` にて詳細なタスクとスケジュールを定義。

* **Day 1–2**: 基盤構築、SwitchBot APIクライアント実装、UI骨組み
* **Day 3–4**: LLM連携（harmony）、Webhook 受信、E2E疎通
* **Day 5–6**: 自動化・シーン機能、デモ準備、撮影、提出

## 13. デモシナリオ（提出動画）

1. 玄関で「外出する」→ ロック施錠・照明OFF・カーテン閉・ロボ掃除機予約。
2. 帰宅 → Webhookでドア開検知 → LLMが「ただいまモード」を提案（照明ON、空調最適）。([GitHub][1])

## 14. 代替/拡張案（アイデア出し）

* **安全モード**：深夜は「解錠コマンド」を無効化し、代わりに家族への確認通知。
* **コンテキスト融合**：天気/電気料金APIと組み合わせ、**時間帯別最適化**。
* **HAエコシステム公開**：RoomSense GPTをHAアドオンとして配布（BLE/Matter併用）。([Home Assistant][6])
* **ローカル優先**：家庭LAN内で20Bを動かし、会話と制御を**完全ローカル**化（プライバシ強化）。([OpenAI][4])
* **マルチユーザ対応**：家族メンバーごとの権限管理（子供は照明のみ、大人はフルアクセス等）。
* **音声入力統合**：Web Speech API や Whisper を用いた音声→テキスト変換でハンズフリー操作。
* **デバイスグルーピング/ルーム管理**：デバイスを部屋単位でグルーピングし、「リビングの電気を全部消して」のような部屋指定操作に対応。
* **操作ダッシュボード**：デバイスの操作頻度、エネルギー消費推定、自動化ルールの実行統計を可視化するダッシュボード。

## 15. 参考（必読リンク）

* OpenAI Devpost ハッカソン概要/ルール/スケジュール。([OpenAI Open Model Hackathon][2])
* gpt-oss 公式発表とGitHub（MXFP4やモデル特性）。([OpenAI][4], [GitHub][3])
* harmony 仕様（ツール出力形式）。([GitHub][7])
* SwitchBot API v1.1（認証・レート・Webhook・デバイス一覧・コマンド）。([GitHub][1])
* Home Assistant（BLE/Cloud/Matter連携）。([Home Assistant][6], [blog.switch-bot.com][5])

---

`doc/plan.md` で合意した通り、**Node.js/Fastify + Next.js** の構成で進めます。必要であれば、**harmonyのツール定義スキーマ（JSON）**、**SwitchBot署名生成のTypeScriptユーティリティ**、**WebhookのFastAPIサンプル**などの具体的な実装コードも用意できます。まずはモノレポのセットアップから開始しましょうか？

[1]: https://github.com/OpenWonderLabs/SwitchBotAPI "GitHub - OpenWonderLabs/SwitchBotAPI: SwitchBot Open API Documents"
[2]: https://openai.devpost.com/?utm_source=chatgpt.com "OpenAI Open Model Hackathon: Build with gpt-oss ... - Devpost"
[3]: https://github.com/openai/gpt-oss?utm_source=chatgpt.com "openai/gpt-oss"
[4]: https://openai.com/index/introducing-gpt-oss/?utm_source=chatgpt.com "Introducing gpt-oss"
[5]: https://blog.switch-bot.com/switchbot-x-home-assistant-the-official-setup-tips-guide-you-asked-for-3/?utm_source=chatgpt.com "SwitchBot x Home Assistant: The Official Setup & Tips ..."
[6]: https://www.home-assistant.io/integrations/switchbot_cloud/?utm_source=chatgpt.com "SwitchBot Cloud"
[7]: https://github.com/openai/harmony?utm_source=chatgpt.com "openai/harmony"
[8]: https://www.home-assistant.io/integrations/matter/?utm_source=chatgpt.com "Matter"

