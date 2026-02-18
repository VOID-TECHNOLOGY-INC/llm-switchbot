# タスク実行ルール（PROMPT.md）

本ドキュメントは、llm-switchbot プロジェクトのタスク実行時に遵守すべきルールを定義する。
AI エージェント・開発者ともに、すべてのタスクは本ルールに従って実施すること。

---

## 1. ブランチ運用ルール

### 1.1 ブランチ命名規則

```
<type>/<short-description>
```

| type | 用途 |
|------|------|
| `feat/` | 新機能の追加 |
| `fix/` | バグ修正 |
| `refactor/` | リファクタリング（機能変更なし） |
| `test/` | テストの追加・修正のみ |
| `docs/` | ドキュメント変更のみ |
| `chore/` | 依存関係更新、CI 設定変更など |

- 説明部分はケバブケース（例: `feat/dynamic-system-prompt`）
- `main` への直接コミットは禁止。必ず PR 経由でマージする
- 1 タスク = 1 ブランチ。複数タスクを 1 ブランチに混在させない

### 1.2 ブランチ作成手順

1. `main` から最新を pull
2. `main` をベースに新ブランチを作成
3. タスク完了後、`main` への PR を作成
4. CI がグリーンかつレビュー完了後にマージ

```bash
git checkout main
git pull origin main
git checkout -b feat/my-feature
```

### 1.3 コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/) に準拠する。

```
<type>(<scope>): <description>

[optional body]
```

- `type`: feat, fix, refactor, test, docs, chore, ci, perf
- `scope`: 変更対象のパッケージ名（api, web, switchbot-adapter, harmony-tools, shared）
- 例: `feat(api): add dynamic system prompt generation`
- 例: `fix(switchbot-adapter): correct HMAC signature nonce handling`
- 例: `test(api): add unit tests for condition evaluator`

---

## 2. TDD（テスト駆動開発）

すべての機能実装は TDD サイクルに従う。

### 2.1 Red → Green → Refactor サイクル

1. **Red**: 実装前にテストを書く。テストが失敗することを確認する
2. **Green**: テストを通す最小限のコードを書く
3. **Refactor**: テストがグリーンのまま、コードを整理・改善する

### 2.2 テストファースト原則

- 新機能の実装を開始する前に、期待する振る舞いをテストとして記述する
- バグ修正時は、まずそのバグを再現するテストを書いてから修正する
- テストなしのコードは PR でマージしない

### 2.3 テストの粒度

| レイヤー | 対象 | ツール | 実行タイミング |
|----------|------|--------|----------------|
| ユニットテスト | 関数・クラス単位のロジック | Jest + ts-jest | 毎コミット（CI） |
| 統合テスト | API エンドポイント、モジュール間連携 | Jest + supertest | 毎コミット（CI） |
| E2E テスト | ユーザーシナリオ全体 | Playwright / Jest | PR 作成時（CI） |

---

## 3. コーディング規約・シンタックスルール

### 3.1 言語・ランタイム

- **TypeScript 5.x**（strict モード必須）
- **Node.js 20.x**
- パッケージマネージャ: **pnpm**

### 3.2 ESLint ルール

プロジェクト共通の ESLint 設定に従う。主要ルール:

- `prefer-const`: 再代入しない変数は `const` を使う
- `no-var`: `var` は使用禁止
- `@typescript-eslint/no-unused-vars`: 未使用変数はエラー（`_` プレフィックスで抑制可）
- `@typescript-eslint/no-explicit-any`: 可能な限り具体的な型を使う（現在は off だが、新規コードでは型を明示する）

### 3.3 Prettier フォーマット

- Prettier によるコードフォーマットを適用する
- コミット前に `pnpm exec prettier --write .` でフォーマットを統一する

### 3.4 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| 変数・関数 | camelCase | `getDeviceStatus`, `webhookPayload` |
| クラス・インターフェース・型 | PascalCase | `SwitchBotClient`, `AutomationRule` |
| 定数（不変値） | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| ファイル名（ソース） | camelCase または kebab-case | `switchBotClient.ts`, `condition-evaluator.ts` |
| ファイル名（テスト） | 対象ファイル名 + `.test.ts` | `switchBotClient.test.ts` |
| ディレクトリ | kebab-case | `harmony-tools/`, `switchbot-adapter/` |

### 3.5 インポート順序

1. Node.js 組み込みモジュール
2. 外部パッケージ（npm）
3. ワークスペース内パッケージ（`@llm-switchbot/*`）
4. 相対パスのローカルモジュール

各グループ間に空行を入れる。

### 3.6 TypeScript 固有ルール

- `any` 型の使用は最小限に留め、理由をコメントで記述する
- 関数の戻り値の型は明示する（パブリック API）
- `interface` と `type` の使い分け: オブジェクト構造には `interface`、ユニオン・交差型には `type`
- `enum` より `as const` 付きオブジェクトまたはユニオン型を推奨

---

## 4. ユニットテスト

### 4.1 テストファイルの配置

テストファイルは対象ファイルと同一ディレクトリ、または `__tests__/` ディレクトリに配置する。

```
src/
  services/
    conditionEvaluator.ts
    conditionEvaluator.test.ts     # 同一ディレクトリ
    __tests__/
      conditionEvaluator.test.ts   # または __tests__ 配下
```

### 4.2 テスト記述ルール

- `describe` でテスト対象（クラス名・関数名）をグルーピングする
- `it` / `test` の記述は「〜すべき」「〜を返す」形式で、期待動作を明確にする
- **Arrange → Act → Assert** パターンに従う
- モックは最小限に留め、実際の振る舞いに近いテストを書く
- SwitchBot API 等の外部依存はモックする

```typescript
describe('ConditionEvaluator', () => {
  describe('evaluateTemperature', () => {
    it('should return true when temperature exceeds threshold', async () => {
      // Arrange
      const condition = { type: 'temperature', operator: 'gt', value: 28 };
      
      // Act
      const result = await evaluator.evaluate(condition);
      
      // Assert
      expect(result).toBe(true);
    });
  });
});
```

### 4.3 実行コマンド

```bash
# 全パッケージのテスト実行
pnpm test

# 特定パッケージのテスト
pnpm --filter api test
pnpm --filter switchbot-adapter test
pnpm --filter web test

# 特定ファイルのテスト
pnpm --filter api test -- --testPathPattern="conditionEvaluator"

# ウォッチモード（開発中）
pnpm --filter api test -- --watch
```

### 4.4 カバレッジ目標

- 新規コード: **80% 以上**のステートメントカバレッジ
- セキュリティ関連コード（署名生成、Webhook 検証、認証）: **90% 以上**
- CI で Codecov にアップロードし、カバレッジの推移を追跡する

---

## 5. E2E テスト

### 5.1 対象シナリオ

E2E テストは `doc/spec.md` に記載されたユースケースを網羅する。最低限以下をカバー:

1. **会話→デバイス制御**: チャット UI からメッセージ送信 → LLM がツール呼び出し → SwitchBot API 実行 → 結果表示
2. **Webhook→UI 反映**: Webhook イベント受信 → バックエンド処理 → フロントエンドへの即時反映
3. **自動化ワークフロー**: 自然言語からルール生成 → 保存 → 条件トリガーで実行
4. **シーン操作**: シーン一覧取得 → シーン実行 → 結果確認

### 5.2 テスト環境

- SwitchBot API はモックサーバーを使用する（実デバイスへの接続は手動テストのみ）
- LLM は固定レスポンスのモックまたはテスト用軽量モデルを使用する
- テストデータはフィクスチャとして管理する

### 5.3 実行コマンド

E2E は `package.json` の `test:e2e` スクリプトとして定義し、以下の形式で実行する。
（`test:e2e` が未定義の場合は、先に E2E 導入タスクでスクリプトを追加する）

```bash
pnpm --filter <package-name> run test:e2e
```

---

## 6. 仕様と実装の整合性チェック

### 6.1 タスク完了時の必須確認

**すべてのタスク完了時に以下を実施する:**

1. `doc/spec.md` を読み、タスクで変更した機能に関連する仕様セクションを特定する
2. 実装が仕様に準拠しているか確認する（API のエンドポイント、リクエスト/レスポンス形式、データモデル、振る舞い）
3. 乖離がある場合、以下の判断フローに従う

### 6.2 乖離発見時の対応フロー

```
仕様と実装に乖離を発見
  │
  ├─ 意図的な変更か？
  │   ├─ Yes → doc/spec.md を更新し、変更理由をコミットメッセージに記載
  │   └─ No → 以下へ
  │
  ├─ doc/plan.md の後続タスクで対応予定か？
  │   ├─ Yes → doc/plan.md の該当タスクにコメントを追記
  │   │        （形式: `<!-- NOTE: <乖離内容> は本タスクで対応予定 -->`）
  │   └─ No → doc/plan.md のタスク分解セクション（§17）に新規タスクを追加
  │            （形式: `- [ ] <乖離を修正する具体的なタスク説明>`）
  │
  └─ PR の説明に乖離の詳細と対応方針を記載
```

### 6.3 チェック対象

| チェック項目 | 参照先（spec.md） | 確認内容 |
|---|---|---|
| API エンドポイント | §5 API 設計 | URL パス、HTTP メソッド、リクエスト/レスポンス形式 |
| データモデル | §7 (plan.md) | フィールド名、型、必須/任意 |
| LLM ツール定義 | §4.1, §9 (plan.md) | ツール名、パラメータスキーマ |
| セキュリティ要件 | §9 セキュリティ | 二段階確認、署名検証、シークレット管理 |
| エラーハンドリング | §8 エラーハンドリング | フォールバック、リトライ、グレースフルデグラデーション |
| 非機能要件 | §10 信頼性, §11 評価指標 | レート制限、レイテンシ目標 |

---

## 7. プロジェクト固有の実装ルール

### 7.1 SwitchBot API 関連

- **HMAC 署名**: `sign = base64(HMAC_SHA256(secret, token + t + nonce))` の実装は `packages/switchbot-adapter` に集約する。他のパッケージから直接署名を生成しない
- **レート制限**: 1 万回/日の制限を常に意識し、不要な API コールを最小化する
  - `/devices` のレスポンスは 10〜30 分キャッシュする
  - `/status` のポーリングは最小限にし、Webhook イベントを優先する
- **リトライ**: 429/401 レスポンスに対して指数バックオフでリトライする（最大 3 回）
- **トークン/シークレット**: `.env` ファイルで管理し、コードにハードコードしない。`.env` はコミットしない

### 7.2 LLM 連携関連

- **マルチアダプター**: `LLMFactory` 経由でアダプターを生成する。直接 `new OpenAIAdapter()` しない
- **harmony 形式**: ツール定義は `packages/harmony-tools` で一元管理する
- **フォールバック**: LLM 障害時はパターンマッチング解析（`WorkflowParser`）にフォールバックする。LLM 依存のコードには必ずフォールバックパスを用意する
- **温度設定**: 安定した出力が必要なツール呼び出しでは `temperature: 0.1` を使用する

### 7.3 セキュリティ

- **危険操作（解錠等）は二段階確認を必須とする**: LLM が直接実行せず、ユーザー確認を挟む
- **Webhook の検証**: 検証トークン + 署名検証 + nonce リプレイ防止を実装する
- **シークレット管理**: `SWITCHBOT_TOKEN`, `SWITCHBOT_SECRET`, `LLM_API_KEY` はサーバー側のみで保持する。フロントエンドに露出させない
- **ログの個人情報最小化**: デバイス ID はログに記録するが、トークンやシークレットは絶対にログに出力しない

### 7.4 エラーハンドリング

- すべての外部 API 呼び出し（SwitchBot API, LLM API）は try-catch で囲む
- エラーは分類して適切に処理する:
  - `4xx`: ユーザーへのエラー表示と修正ガイド
  - `5xx`: 自動リトライ + 代替案提示
  - ネットワーク障害: キャッシュでの表示継続 + オフラインバナー
- エラーレスポンスには `requestId` を含め、トレース可能にする

### 7.5 ログ

- **pino** を使用した構造化ログを出力する
- 必須フィールド: `requestId`, `timestamp`, `level`, `message`
- API リクエストには `deviceId`, `command`, `latencyMs`, `status` を含める
- ログレベル: `error`（障害）、`warn`（リトライ/フォールバック）、`info`（正常処理）、`debug`（開発用詳細）

### 7.6 モノレポ間の依存関係

```
apps/web  ──→  packages/shared
apps/api  ──→  packages/shared
              packages/switchbot-adapter
              packages/harmony-tools
```

- `packages/*` は `apps/*` に依存しない（逆方向の依存は禁止）
- パッケージ間の依存は `package.json` の `dependencies` で明示的に宣言する
- 循環依存を作らない

### 7.7 環境変数

- すべての環境変数は `.env.example` に説明付きで記載する
- 必須の環境変数が未設定の場合、起動時にわかりやすいエラーメッセージを表示して終了する
- デフォルト値がある場合はコード内で設定し、`.env.example` にもデフォルト値をコメントで記載する

---

## 8. CI/CD パイプライン

### 8.1 PR マージ前の必須チェック（CI グリーン必須）

1. **Lint**: 全パッケージの ESLint チェック
2. **Type Check**: TypeScript の型チェック
3. **Unit Test**: 全パッケージのユニットテスト
4. **Build**: 全パッケージ・アプリのビルド成功
5. **Security Audit**: `pnpm audit` で critical 脆弱性がないこと

### 8.2 コミット時の自動チェック（husky + lint-staged）

**husky** と **lint-staged** を使用し、`git commit` 実行時に自動でフォーマットと Lint を適用する。

#### セットアップ

```bash
pnpm add -Dw husky lint-staged
pnpm pkg set scripts.prepare="husky"
pnpm exec husky init
```

- ルート `package.json` に `"prepare": "husky"` が設定されていること
- `.husky/pre-commit` をリポジトリにコミットすること

#### 設定（ルート `package.json` に追記）

```json
{
  "lint-staged": {
    "**/*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "**/*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

#### Git フック（`.husky/pre-commit`）

```bash
pnpm exec lint-staged
```

#### 動作

- **ステージング済みファイルのみ**が対象（全ファイル走査ではない）
- ESLint の自動修正 (`--fix`) → Prettier のフォーマット → 修正結果を自動でステージに追加
- Lint エラーが自動修正不可の場合、コミットはブロックされる
- `--no-verify` でのスキップは禁止（§10 禁止事項 参照）

### 8.3 ローカルでの事前確認

PR 作成前にローカルで以下を実行し、CI と同じチェックを通すこと:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

---

## 9. タスク実行の標準フロー

すべてのタスクは以下のフローで実行する:

```
1. タスクの理解
   └─ doc/plan.md で対象タスクの内容・スコープを確認

2. ブランチ作成
   └─ main から新ブランチを作成（§1 に従う）

3. テスト作成（Red）
   └─ 期待動作をユニットテストとして記述
   └─ テストが失敗することを確認

4. 実装（Green）
   └─ テストを通す最小限のコードを実装

5. リファクタリング（Refactor）
   └─ テストがグリーンのまま、コード品質を改善

6. ローカル検証
   └─ pnpm lint && pnpm typecheck && pnpm test && pnpm build

7. 仕様整合性チェック（§6 に従う）
   └─ doc/spec.md と実装の乖離を確認
   └─ 乖離があれば doc/plan.md を更新

8. コミット & PR 作成
   └─ Conventional Commits でコミット
   └─ CI がグリーンであることを確認

9. タスク完了
   └─ doc/plan.md の該当タスクにチェックを入れる
```

---

## 10. 禁止事項

- `main` への直接 push
- テストなしでの機能コード追加
- `.env` ファイルや秘密情報のコミット
- `node_modules/` や `dist/` のコミット
- `console.log` による一時的なデバッグ出力の残留（pino ロガーを使用する）
- 未追跡ファイルの無断削除（macOS の `._` ファイルは除く）
- 型安全性を損なう `as any` の濫用（やむを得ない場合は理由をコメントに記載）
- `git commit --no-verify` による pre-commit フック（lint-staged）のスキップ
