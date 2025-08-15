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

### 4.1 LLM（gpt-oss）

* **モデル選択**

  * デフォルト：`gpt-oss-20b`（16GBクラスで動作可）
  * 高精度：`gpt-oss-120b`（80GB GPUで単機稼働、MXFP4量子化）([GitHub][3])
* **I/O形式**：OpenAI **harmony**（マルチチャネル出力、ツールコール前提）([GitHub][7])
* **プロンプト戦略**

  * システム：家電ドメインの**ポリシー**（安全・許可・確認）
  * ツール：`get_devices`, `get_status`, `send_command`, `create_scene`, `exec_scene`
  * メモリ：最近の環境値（温湿度/在宅/時刻/就寝スケジュール）

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

## 6. セキュリティ/プライバシ

* SwitchBot **トークン/シークレットはKMS/Secret Manager**で保護、サーバ側のみ保持。
* 危険コマンドは**二段階確認**（例：鍵の解錠は在宅・時刻・ジオフェンス条件をLLMで評価→最後にユーザ確認）。
* Webhookは**検証トークン**と**IP許可**で保護。

## 7. 信頼性・スロットリング

* **レート保護**：ユーザ毎・デバイス毎のクォータ、バッチ化、状態キャッシュ（`/status`のポーリング最小化）。**1万/日**の制限に対して、PullよりWebhook優先。([GitHub][1])
* リトライは指数バックオフ、429/401時の再試行ポリシー（トークン再生成）。

## 8. 評価指標（デモ審査向け）

* **Intent成功率**（正しく家電を操作できた割合）
* **対話→操作レイテンシ**（p50/p95）
* **イベント追従性**（WebhookからUI反映までの遅延）
* **シーン推薦の受容率**（ユーザが採用した割合）

## 9. 実装計画（ハッカソン向けスプリント）

`doc/plan.md` にて詳細なタスクとスケジュールを定義。

* **Day 1–2**: 基盤構築、SwitchBot APIクライアント実装、UI骨組み
* **Day 3–4**: LLM連携（harmony）、Webhook 受信、E2E疎通
* **Day 5–6**: 自動化・シーン機能、デモ準備、撮影、提出

## 10. デモシナリオ（提出動画）

1. 玄関で「外出する」→ ロック施錠・照明OFF・カーテン閉・ロボ掃除機予約。
2. 帰宅 → Webhookでドア開検知 → LLMが「ただいまモード」を提案（照明ON、空調最適）。([GitHub][1])

## 11. 代替/拡張案（アイデア出し）

* **安全モード**：深夜は「解錠コマンド」を無効化し、代わりに家族への確認通知。
* **コンテキスト融合**：天気/電気料金APIと組み合わせ、**時間帯別最適化**。
* **HAエコシステム公開**：RoomSense GPTをHAアドオンとして配布（BLE/Matter併用）。([Home Assistant][6])
* **ローカル優先**：家庭LAN内で20Bを動かし、会話と制御を**完全ローカル**化（プライバシ強化）。([OpenAI][4])

## 12. 参考（必読リンク）

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

