---
inclusion: auto
name: Project Guidelines
description: "プロジェクト全体の指針、技術スタック、ワークフロー、ベストプラクティス"
---

# scan_conpass プロジェクト ガイドライン

## プロジェクト概要

**名前**: scan_conpass (イベント参加用 QRコード受付システム)

**目的**: Connpass イベント会場での参加者受付を効率化する Web アプリケーション。受付スタッフがブラウザ上でカメラから QRコードを読み取り、バックエンドが Connpass 参加者一覧と照合して登録結果を自動保存します。

**構成**: 
- **フロントエンド**: Vercel にホスティングされた Vue/React SPA
- **バックエンド**: Cloudflare Workers で動作する Node.js API
- **ストレージ**: Cloudflare KV Store + Google Sheets API
- **スクレイピング対象**: Connpass（www.connpass.com）

---

## 技術スタック

### フロントエンド
- **ランタイム**: Node.js / ブラウザ
- **フレームワーク**: Vue 3 または React 18+
- **ビルドツール**: Vite
- **QRコード読取**: jsQR ライブラリ
- **ホスティング**: Vercel（無料枠利用）
- **環境変数**: `.env.local`（ローカル）、`.env.production`（本番）

### バックエンド
- **ランタイム**: Cloudflare Workers
- **言語**: TypeScript
- **スクレイピング**: fetch + Cheerio または正規表現パース
- **ストレージ**: Cloudflare KV Store（複数 Namespace）
- **認証**: API パスワード（Bearer トークン）
- **外部 API**: Google Sheets API、Connpass
- **ホスティング**: Cloudflare Workers（無料枠利用）
- **デプロイツール**: Wrangler CLI

### 開発・テスト
- **フロントエンドテスト**: Vitest + Vue Test Utils
- **バックエンドテスト**: Jest
- **統合テスト**: cURL、Postman、または fetch API
- **ローカル開発**: `npm run dev`（フロントエンド）、`wrangler dev`（バックエンド）

---

## プロジェクト構造

```
scan_conpass/
├── frontend/                      # Vue/React フロントエンド
│   ├── src/
│   │   ├── components/
│   │   │   ├── QRScanner.vue      # QRコード読取コンポーネント
│   │   │   ├── ResultDisplay.vue  # 登録結果表示
│   │   │   └── ErrorMessage.vue   # エラーメッセージ
│   │   ├── App.vue
│   │   ├── main.js
│   │   └── config.ts              # API 設定
│   ├── vite.config.js
│   ├── vercel.json
│   ├── package.json
│   ├── .env.local
│   ├── .env.production
│   └── tsconfig.json
│
├── backend/                       # Cloudflare Workers バックエンド
│   ├── src/
│   │   ├── index.ts               # メインエントリーポイント
│   │   ├── middleware/
│   │   │   └── auth.ts            # API パスワード認証
│   │   ├── services/
│   │   │   ├── connpass.ts        # Connpass スクレイピング
│   │   │   ├── storage.ts         # KV + Google Sheets 保存
│   │   │   └── audit.ts           # ログ記録
│   │   ├── utils/
│   │   │   ├── parser.ts          # HTML パース
│   │   │   ├── cache.ts           # KV キャッシング
│   │   │   └── errors.ts          # エラーハンドリング
│   │   └── admin.ts               # 管理画面エンドポイント
│   ├── wrangler.toml              # Wrangler 設定（本番）
│   ├── wrangler.local.toml        # Wrangler 設定（ローカル）
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.local
│   ├── .env.production
│   └── jest.config.js
│
├── .kiro/
│   ├── specs/
│   │   └── event-qrcode-reception/
│   │       ├── requirements.md    # 要件定義
│   │       └── design.md          # 技術設計
│   ├── steering/
│   │   └── project-guidelines.md  # このファイル
│   └── hooks/                     # 自動実行フック
│
└── README.md                      # プロジェクト README
```

---

## ビルド・テスト・デプロイ方法

### ローカル開発

#### フロントエンド
```bash
cd frontend
npm install
npm run dev                  # http://localhost:5173
npm run build               # 本番ビルド
npm run test                # テスト実行
npm run lint                # Linting
```

#### バックエンド
```bash
cd backend
npm install
wrangler dev                # http://localhost:8787 でローカル実行
npm run test                # テスト実行
```

### デプロイ

#### フロントエンド → Vercel
```bash
# Git 連携自動デプロイ（推奨）
# GitHub push → Vercel 自動ビルド・デプロイ

# または手動デプロイ
cd frontend
vercel deploy --prod
```

#### バックエンド → Cloudflare Workers
```bash
# GitHub Actions 自動デプロイ（推奨）
# Git push → GitHub Actions → wrangler publish

# または手動デプロイ
cd backend
wrangler publish --env production
```

---

## 環境変数設定

### フロントエンド（frontend/.env.production）
```bash
VITE_API_PASSWORD=<secure_password_here>
VITE_API_BASE_URL=https://api.your-domain.workers.dev
VITE_EVENT_URL=https://www.connpass.com/event/xxxxx/
```

### バックエンド（backend/wrangler.toml）
```toml
[env.production]
vars = {
  API_PASSWORD = "use_wrangler_secret",
  API_PASSWORD_EXPIRY = "2025-12-31T23:59:59Z",
  FRONTEND_URL = "https://your-domain.vercel.app",
  GOOGLE_SHEET_ID = "xxxxx",
  GOOGLE_SHEETS_API_KEY = "your_api_key_here"
}

[[kv_namespaces]]
binding = "CONNPASS_SESSION"
id = "xxxxxxxxxxxxxxxx"

[[kv_namespaces]]
binding = "PARTICIPANTS_CACHE"
id = "yyyyyyyyyyyyyyyy"

[[kv_namespaces]]
binding = "REGISTRATION_RECORDS"
id = "zzzzzzzzzzzzzzzz"

[[kv_namespaces]]
binding = "AUDIT_LOGS"
id = "wwwwwwwwwwwwwwww"
```

---

## コーディング規約

### 全般
- **言語**: TypeScript（型安全性を優先）
- **コード整形**: oxfmt（Rust ツール）または Prettier
- **Linting**: oxlint（Rust ツール）または ESLint + TypeScript eslint
- **Markdown フォーマット**: markdownlint による自動整形
- **コミットメッセージ**: 英語、命令形（例：`Fix QR scanner memory leak`）

### Lint・Format コマンド

#### フロントエンド
```bash
cd frontend
npm run lint                # ESLint 実行
npm run format              # Prettier で整形
npm run lint:fix            # ESLint 自動修正
```

#### バックエンド
```bash
cd backend
npm run lint                # ESLint 実行
npm run format              # Prettier で整形
npm run lint:fix            # ESLint 自動修正
```

#### ドキュメント（Markdown）
```bash
# oxfmt を使用した整形（オプション）
oxfmt .kiro/steering/project-guidelines.md

# oxlint による Markdown 検査（オプション）
oxlint .kiro/steering/project-guidelines.md
```

### oxlint / oxfmt 設定

**oxlint** - JavaScript/TypeScript Linter（ESLint より高速）
- インストール: `npm install -D oxc_cli`
- 用途: コード品質チェック、セキュリティ警告
- 設定ファイル: `.oxlintrc.json` または `oxlint.json`

**oxfmt** - コードフォーマッター
- インストール: `npm install -D @oxc/formatter`
- 用途: コードの自動整形
- 設定ファイル: `.oxfmtrc` または `prettier.config.js`

**markdownlint** - Markdown Linter
- インストール: `npm install -D markdownlint-cli`
- 用途: Markdown ファイルの統一性チェック
- 設定ファイル: `.markdownlintrc`

### TypeScript
- 型注釈は必須（`any` は使用禁止）
- インターフェース・型定義は `types/` または `services/` に集約
- エラーハンドリングは明示的（try-catch で捕捉）
- async/await 推奨（コールバック地獄回避）

### コンポーネント（Vue/React）
- **ファイル名**: PascalCase（例：`QRScanner.vue`）
- **Props**: 型定義を明示（TypeScript または PropTypes）
- **ステート管理**: Pinia（Vue）または Redux（React）
- **スタイル**: Scoped CSS または CSS Modules

### API エンドポイント
- **命名規則**: `POST /api/resource/action`（例：`POST /api/registration/register`）
- **レスポンス形式**: 統一的な JSON（`{ success, data, error, message }`）
- **エラーコード**: 定義済みの Error_Code を使用
- **ロギング**: Audit_System で記録

### テスト
- **ユニットテスト**: 各関数・コンポーネントに最低 1 つのテスト
- **統合テスト**: API エンドポイント動作確認
- **テストカバレッジ**: 目標 80% 以上
- **テストランナー**: `npm run test --run`（ウォッチモード回避）

---

## セキュリティ要件

### 認証・認可
- API パスワードは環境変数で管理（Git に含めない）
- Authorization ヘッダで Bearer トークン形式で送信
- パスワード有効期限チェック（API_PASSWORD_EXPIRY）
- CORS は特定ドメイン（FRONTEND_URL）のみ許可

### ログ・監査証跡
- パスワードや個人情報はログに記録しない
- すべてのリクエスト・レスポンスをタイムスタンプ付きで記録
- 監査ログは最低 30 日保持
- エラー発生時にエラーコードを記録

### データ保存
- Google Sheets API は公開シートではなく非公開設定
- KV Store 内のデータは定期的に暗号化
- IP アドレス記録時は個人識別情報として取り扱い

---

## パフォーマンス目標

| 処理 | 目標 | 手段 |
|---|---|---|
| API パスワード検証 | < 10ms | 環境変数参照のみ |
| キャッシュヒット時の登録 | < 200ms | メモリキャッシュ活用 |
| キャッシュミス時の登録 | < 3s | 並列 fetch、正規表現パース |
| QRコード読取レスポンス | < 100ms | jsQR ライブラリ |
| Google Sheets 保存 | < 1s | 非同期処理 |

### Cloudflare Workers 制約への対応
- **タイムアウト**: 30 秒（Google Sheets 保存は非同期で実行）
- **CPU 時間**: 50ms/リクエスト（正規表現パースで対応）
- **メモリ**: 128MB（大規模 HTML は分割パース）
- **KV 読込**: 100k/日（キャッシング TTL: 5-10 分）

---

## トラブルシューティング

### スクレイピング失敗
**症状**: `SCRAPING_FAILED` エラー

**原因**: Connpass ページ構造が変更された可能性

**対応**:
1. Connpass ページのソースコードを確認
2. `src/utils/parser.ts` の正規表現または Cheerio セレクタを更新
3. ローカルで `wrangler dev` で検証
4. `wrangler publish --env production` で本番デプロイ

### KV キャッシュ不効果
**症状**: パフォーマンスが低下、KV 読み込み制限に達する

**原因**: TTL が短すぎるか、キャッシュキーの設計に問題

**対応**:
1. TTL を 10-15 分に延長（`src/services/connpass.ts`）
2. キャッシュキー設計見直し（イベント ID ベース）
3. Cloudflare ダッシュボードで実際の KV アクセス数を確認

### Google Sheets API レート制限
**症状**: 保存が失敗する、502/503 エラー

**原因**: 1 秒あたり 60 リクエスト制限に達した

**対応**:
1. リトライロジック確認（最大 3 回、100ms 間隔）
2. バッチ API への移行を検討
3. 有料サービスアカウント使用を検討

---

## デバッグ・ログ出力

### フロントエンド
```typescript
// src/config.ts でデバッグログを制御
export const DEBUG = import.meta.env.DEV;

// コンポーネント内で使用
if (DEBUG) console.log('[QRScanner]', qrData);
```

### バックエンド
```typescript
// src/index.ts でログレベル制御
const LOG_LEVEL = env.LOG_LEVEL || 'info';

// サービス内で使用
console.log('[connpass]', 'Scraping started for event:', eventUrl);
```

### ローカルテスト
```bash
# フロントエンド
cd frontend
npm run dev        # ブラウザコンソールでログ確認

# バックエンド
cd backend
wrangler dev       # ターミナルでログ確認
wrangler tail --env production  # 本番ログ確認
```

---

## よくある質問（FAQ）

**Q: QRコード読取が遅い場合はどうすればいい？**
A: jsQR ライブラリの設定（`maxPatternCount`）を確認。照明環境改善、カメラ解像度調整を試してください。

**Q: 複数イベントに対応できる？**
A: 現在は単一イベント URL が前提。複数対応には `VITE_EVENT_URL` を動的切り替えに変更が必要です。

**Q: 登録履歴は本当に削除されない？**
A: KV Store は 30 日で自動削除設定。Google Sheets に保存されたデータは手動削除まで永続。

**Q: API パスワードを変更したい？**
A: `wrangler secret put API_PASSWORD --env production` で更新。フロントエンドも `.env.production` で更新後、Vercel に再デプロイ。

---

## 参考資料

- [Spec: requirements.md](.kiro/specs/event-qrcode-reception/requirements.md)
- [Spec: design.md](.kiro/specs/event-qrcode-reception/design.md)
- [Vercel Docs](https://vercel.com/docs)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [jsQR Library](https://github.com/cozmo/jsQR)
- [Connpass API](https://connpass.com/)
- [Google Sheets API](https://developers.google.com/sheets/api)

---

## 連絡先・サポート

- **プロジェクト管理**: GitHub Issues
- **設計相談**: `.kiro/specs/` ディレクトリ
- **本番トラブル**: Cloudflare ダッシュボード → Logs 確認
