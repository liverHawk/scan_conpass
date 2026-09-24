# 実装計画: イベント参加用 QRコード受付システム

## 概要

本実装計画は、requirements.md と design.md に基づいて、Vercel フロントエンド + Cloudflare Workers バックエンド + Google Sheets/CSV ストレージの完全無料システムを段階的に構築するための実行手順です。

**実装言語**:
- フロントエンド: TypeScript + Vue.js 3 (Vite)
- バックエンド: TypeScript + Cloudflare Workers
- テスト: Vitest (フロント), Jest (バック)

**所要時間目安**: 40-50 時間

---

## タスク一覧

### 1. プロジェクト初期化とセットアップ

#### 1.1 ローカル開発環境構築
**優先度**: CRITICAL  
**見積もり**: 2 時間  
**先行タスク**: なし

**説明**:
ローカル開発マシンに必要な開発ツール、Node.js、pnpm 環境を mise で管理します。

**受け入れ基準**:
1. **mise がインストールされている**
   - インストール方法: https://mise.jdx.dev/getting-started.html
   - 確認: `mise --version`

2. **プロジェクトルートに `.mise.toml` が作成されている**
   ```toml
   [env]
   # 環境変数設定（必要に応じて）

   [tools]
   node = "latest"  # Node.js 最新版
   pnpm = "latest"  # pnpm 最新版
   ```

3. **`mise install` でツール自動インストール**
   - コマンド: `mise install`
   - 確認: `mise ls`

4. **Node.js と pnpm のバージョン確認**
   - `node --version` で最新版が表示される
   - `pnpm --version` で pnpm@latest が表示される

5. Vercel CLI が正常にインストールされている（オプション：`npm install -g vercel`）

6. Wrangler CLI が正常にインストールされている（オプション：`npm install -g @cloudflare/wrangler`）

7. Git が初期化されリモートリポジトリにリンクされている

8. .gitignore ファイルが作成され、以下が除外されている：
   - node_modules
   - .env.local
   - .wrangler
   - .turbo
   - dist
   - build
   - pnpm-lock.yaml
   - .mise（mise が作成するディレクトリ）

**成果物**:
- プロジェクトルート/.mise.toml
- ローカル環境準備チェックリスト
- .gitignore 設定

**初期設定手順**:
```bash
# プロジェクトルートで
cd /Users/toshi_pro/Documents/gdg/scan_conpass

# .mise.toml を作成（自動生成）
mise init --tool node --tool pnpm

# またはテキストエディタで手動作成

# ツールをインストール
mise install

# インストール確認
mise ls
node --version
pnpm --version
```

---

#### 1.2 Vercel フロントエンドプロジェクト初期化
**優先度**: CRITICAL  
**見積もり**: 2 時間  
**先行タスク**: 1.1

**説明**:
Vue.js 3 + TypeScript + Vite でフロントエンドプロジェクトの雛形を作成します。

**受け入れ基準**:
1. `frontend/` ディレクトリが作成されている
2. package.json に必要な依存関係が記載されている（vue、vite、typescript、jsqr）
3. vite.config.js が設定されている（Vue プラグイン、TypeScript サポート）
4. `src/main.ts` エントリーポイントが作成されている
5. `src/App.vue` ルートコンポーネントが作成されている
6. `npm run dev` でローカルデバッグサーバーが起動可能
7. `npm run build` でプロダクションビルドが成功する

**成果物**:
- frontend/package.json
- frontend/vite.config.js
- frontend/tsconfig.json
- frontend/src/main.ts
- frontend/src/App.vue

---

#### 1.3 Cloudflare Workers バックエンドプロジェクト初期化
**優先度**: CRITICAL  
**見積もり**: 2 時間  
**先行タスク**: 1.1

**説明**:
Cloudflare Workers + TypeScript でバックエンドプロジェクトの雛形を作成します。

**受け入れ基準**:
1. `backend/` ディレクトリが作成されている
2. package.json に必要な依存関係が記載されている（wrangler、cheerio、typescript）
3. wrangler.toml が設定されている（KV Namespace プレースホルダー、ルーティング）
4. `src/index.ts` メインエントリーポイントが作成されている
5. TypeScript コンパイル設定（tsconfig.json）が設定されている
6. `wrangler dev` でローカルデバッグサーバーが起動可能
7. `wrangler publish --env production` でビルドが成功する

**成果物**:
- backend/package.json
- backend/wrangler.toml
- backend/tsconfig.json
- backend/src/index.ts

---

#### 1.4 依存パッケージのインストール
**優先度**: CRITICAL  
**見積もり**: 1 時間  
**先行タスク**: 1.2, 1.3

**説明**:
フロントエンドとバックエンド両方の npm 依存関係をインストールします。

**受け入れ基準**:
1. `frontend/node_modules/` が存在し、すべての依存パッケージがインストール完了
2. `backend/node_modules/` が存在し、すべての依存パッケージがインストール完了
3. `npm install` が両ディレクトリでエラーなく完了
4. package-lock.json / yarn.lock がバージョン管理に含まれている

**成果物**:
- frontend/node_modules/（.gitignore 対象）
- backend/node_modules/（.gitignore 対象）
- インストール確認ログ

---

#### 1.5 環境変数テンプレート作成
**優先度**: CRITICAL  
**見積もり**: 1 時間  
**先行タスク**: 1.2, 1.3

**説明**:
ローカル開発とプロダクション環境向けの環境変数テンプレートを作成します。

**受け入れ基準**:
1. `frontend/.env.local.example` が作成され、必要な環境変数（VITE_API_PASSWORD, VITE_API_BASE_URL, VITE_EVENT_URL）がコメント付きで記載
2. `backend/.env.local.example` が作成され、必要な環境変数（API_PASSWORD, CONNPASS_EMAIL, CONNPASS_PASSWORD）がコメント付きで記載
3. `frontend/.env.local` と `backend/.env.local` は .gitignore に記載されている
4. README.md に環境変数セットアップ手順が記載されている

**成果物**:
- frontend/.env.local.example
- backend/.env.local.example
- .env 設定ガイド（README.md 抜粋）

---

### 2. バックエンド実装

#### 2.1 API 認証ミドルウェアの実装
**優先度**: CRITICAL  
**見積もり**: 3 時間  
**先行タスク**: 1.3

**説明**:
Authorization ヘッダを検証し、API パスワードと有効期限をチェックするミドルウェアを実装します。

**受け入れ基準**:
1. `backend/src/middleware/auth.ts` が作成されている
2. Authorization ヘッダから Bearer トークンを抽出する関数が実装されている
3. API_PASSWORD 環境変数との照合ロジックが実装されている
4. API_PASSWORD_EXPIRY の有効期限チェックロジックが実装されている
5. 認証失敗時に以下のエラーコードを返す：
   - INVALID_PASSWORD（パスワード不正）
   - PASSWORD_EXPIRED（有効期限切れ）
6. すべてのエラーレスポンスは JSON 形式で、HTTP 401 ステータスを返す
7. ミドルウェアがチェーンされ、他の処理をブロック可能である
8. ユニットテスト（jest）で 5 パターン以上テストされている

**受け入れ基準**（要件対応）:
- 要件 2: API パスワード認証

**成果物**:
- backend/src/middleware/auth.ts
- backend/src/middleware/auth.test.ts

---

#### 2.2 型定義とユーティリティの作成
**優先度**: CRITICAL  
**見積もり**: 2 時間  
**先行タスク**: 1.3

**説明**:
TypeScript 型定義、エラーコード定義、ユーティリティ関数を一元管理するファイルを作成します。

**受け入れ基準**:
1. `backend/src/types/index.ts` が作成され、以下の型が定義されている：
   - `Request` リクエスト型
   - `Response` レスポンス型
   - `RegistrationRecord` 登録レコード型
   - `Participant` 参加者型
2. `backend/src/errors.ts` が作成され、8 つのエラーコードと対応メッセージが定義されている：
   - INVALID_PASSWORD
   - PASSWORD_EXPIRED
   - INVALID_QR_FORMAT
   - PARTICIPANT_NOT_FOUND
   - ALREADY_REGISTERED
   - SCRAPING_FAILED
   - SESSION_EXPIRED
   - NETWORK_ERROR
   - INTERNAL_SERVER_ERROR
3. `backend/src/utils/validators.ts` が作成され、以下の検証関数が実装されている：
   - isValidEventUrl（URL 形式チェック）
   - isValidQRCodeData（QRコードデータ形式チェック）
   - extractEventId（URL から イベント ID を抽出）
4. すべての型がタイムスタンプ（ISO 8601）やタイムゾーン対応に対応している

**成果物**:
- backend/src/types/index.ts
- backend/src/errors.ts
- backend/src/utils/validators.ts

---

#### 2.3 Connpass スクレイピングサービスの実装（第1段階）
**優先度**: CRITICAL  
**見積もり**: 4 時間  
**先行タスク**: 2.2

**説明**:
Connpass イベントページにアクセスして参加者一覧をスクレイピングで取得するサービスを実装します。Cheerio による HTML パース、または正規表現パースの両方に対応。

**受け入れ基準**:
1. `backend/src/services/connpass.ts` が作成されている
2. Connpass イベント URL に fetch でアクセスする関数が実装されている
3. HTML をパースして参加者一覧（ユーザー名の配列）を抽出する関数が実装されている
4. Cheerio を使用した CSS セレクタベースのパース方式が実装されている（代替案）
5. 正規表現パース方式も実装されている（フォールバック）
6. パース対象の HTML 構造が Connpass の実際の構造に合わせて調整されている
7. ネットワークエラーや HTML パース失敗時に適切なエラーを返す
8. タイムアウト機構（30 秒）が実装されている
9. ユニットテストで以下パターンをカバーしている：
   - 正常な HTML パース
   - 不正な URL
   - ネットワークエラー
   - タイムアウト

**受け入れ基準**（要件対応）:
- 要件 3: Connpass 参加者検証

**成果物**:
- backend/src/services/connpass.ts
- backend/src/services/connpass.test.ts

---

#### 2.4 KV Store キャッシング機構の実装
**優先度**: CRITICAL  
**見積もり**: 3 時間  
**先行タスク**: 2.2

**説明**:
Cloudflare KV Store を使用してスクレイピング結果をキャッシュし、パフォーマンスを最適化します。

**受け入れ基準**:
1. `backend/src/services/cache.ts` が作成されている
2. KV Store から参加者リストを読み込む関数が実装されている
3. 参加者リストを KV Store に 5-10 分（TTL: 300-600 秒）で保存する関数が実装されている
4. キャッシュキーの命名規則が統一されている（例：`connpass:participants:{eventId}`）
5. KV の get/put 操作のエラー処理が実装されている
6. キャッシュミス時の処理フローが定義されている
7. `wrangler kv:key list` で KV キーが正しく保存されていることが確認可能
8. TTL（有効期限）が正しく機能している（テスト環境で短縮して検証）

**受け入れ基準**（要件対応）:
- 要件 3: キャッシング戦略（TTL: 5-10 秒）

**成果物**:
- backend/src/services/cache.ts
- backend/src/services/cache.test.ts

---

#### 2.5 参加者照合と登録レコード作成ロジック
**優先度**: CRITICAL  
**見積もり**: 3 時間  
**先行タスク**: 2.3, 2.4

**説明**:
QRコードデータを Connpass 参加者一覧と照合し、登録レコードを作成・保存します。

**受け入れ基準**:
1. `backend/src/services/registration.ts` が作成されている
2. QRコードデータを参加者リストから検索する関数が実装されている
3. マッチ判定が大文字小文字を区別しない場合の仕様が明記されている
4. 登録レコード作成時に以下フィールドを記録する：
   - タイムスタンプ（ISO 8601）
   - QRコードデータ（ユーザー名）
   - イベント URL
   - 登録ステータス（SUCCESS/FAILED）
   - リクエスト元 IP アドレス
5. 同じ QRコード + イベント URL の二重登録チェックが実装されている
6. 二重登録時に ALREADY_REGISTERED エラーを返す
7. 登録レコードを KV Store に保存する（キー：`registration:{timestamp}:{qrCodeData}`）
8. ユニットテストで以下パターンをカバーしている：
   - 正常な登録
   - 参加者未検出
   - 二重登録
   - パースエラー

**受け入れ基準**（要件対応）:
- 要件 4: 参加登録処理

**成果物**:
- backend/src/services/registration.ts
- backend/src/services/registration.test.ts

---

#### 2.6 Google Sheets 非同期保存サービスの実装
**優先度**: CRITICAL  
**見積もり**: 4 時間  
**先行タスク**: 2.5

**説明**:
登録レコードを Google Sheets API で非同期に保存します。リトライ機構とエラーハンドリングを実装。

**受け入れ基準**:
1. `backend/src/services/storage.ts` が作成されている
2. Google Sheets API v4 の認証（API キーまたはサービスアカウント）が実装されている
3. 新しい行をスプレッドシートに挿入する関数が実装されている
4. 登録レコードの以下フィールドをスプレッドシートに保存する：
   - QRコードデータ
   - 登録タイムスタンプ
   - イベント URL
   - 登録ステータス
5. リトライ機構が実装されている（最大 3 回、100ms 間隔）
6. リトライ失敗時もシステムは成功状態を返す（ログ記録は継続）
7. Google Sheets API のレート制限（1 秒あたり 60 リクエスト）対応が実装されている
8. CSV ファイル保存の代替実装も考慮されている
9. テスト環境では Google Sheets への実際の書き込みをモック化
10. エラーログに失敗詳細を記録する

**受け入れ基準**（要件対応）:
- 要件 5: Google Sheets への自動保存

**成果物**:
- backend/src/services/storage.ts
- backend/src/services/storage.test.ts

---

#### 2.7 監査ログサービスの実装
**優先度**: IMPORTANT  
**見積もり**: 2 時間  
**先行タスク**: 2.2

**説明**:
すべてのリクエスト・レスポンス・エラーを KV Store に監査ログとして記録します。機密情報（パスワード、個人情報）は除外。

**受け入れ基準**:
1. `backend/src/services/audit.ts` が作成されている
2. 以下の情報をログに記録する：
   - タイムスタンプ（ISO 8601）
   - HTTP メソッド
   - リクエストパス
   - レスポンスステータスコード
   - エラーコード（該当時）
   - リクエスト元 IP アドレス
3. 以下の機密情報は絶対にログに含めない：
   - API_PASSWORD の値
   - Authorization ヘッダの内容
   - Connpass ログイン認証情報
4. ログを KV Store に日付キーで保存する（キー：`audit:{YYYY-MM-DD}`）
5. ログファイルの保持期間は 30 日以上
6. ログ取得用の管理エンドポイント（GET /admin/logs）で最近のログを返す

**受け入れ基準**（要件対応）:
- 要件 6: エラーハンドリングと監査証跡

**成果物**:
- backend/src/services/audit.ts
- backend/src/services/audit.test.ts

---

#### 2.8 Registration API エンドポイント実装
**優先度**: CRITICAL  
**見積もり**: 4 時間  
**先行タスク**: 2.1, 2.5, 2.6, 2.7

**説明**:
`POST /api/registration/register` エンドポイントの実装。すべての処理を統合し、リクエスト→認証→検証→保存→レスポンスの一連の処理を実行。

**受け入れ基準**:
1. `backend/src/handlers/registration.ts` が作成されている
2. `POST /api/registration/register` エンドポイントが実装されている
3. リクエストボディから `qrCodeData` と `eventUrl` を抽出
4. 認証ミドルウェア（API パスワード検証）を実行
5. QRコード形式検証を実行（INVALID_QR_FORMAT）
6. Connpass スクレイピング＋キャッシング処理を実行
7. 参加者照合と登録レコード作成を実行
8. Google Sheets 非同期保存を開始
9. 監査ログを記録
10. 成功時に HTTP 200 で JSON レスポンスを返す：
    ```json
    {
      "success": true,
      "message": "Registration successful",
      "participant": {
        "username": "user_001",
        "eventUrl": "...",
        "registeredAt": "2024-01-15T10:30:45Z"
      }
    }
    ```
11. エラー時に適切な HTTP ステータスと JSON エラーレスポンスを返す
12. CORS 対応：Access-Control-Allow-Origin ヘッダを設定
13. 統合テストで以下フローをカバーしている：
    - 正常な登録フロー
    - 認証失敗
    - 参加者未検出
    - ネットワークエラー

**受け入れ基準**（要件対応）:
- 要件 1-6 すべての統合

**成果物**:
- backend/src/handlers/registration.ts
- backend/src/handlers/registration.test.ts

---

#### 2.9 ヘルスチェックと管理エンドポイント実装
**優先度**: IMPORTANT  
**見積もり**: 2 時間  
**先行タスク**: 2.8

**説明**:
`GET /api/health` と `GET /admin/logs` エンドポイントを実装します。

**受け入れ基準**:
1. `backend/src/handlers/admin.ts` が作成されている
2. `GET /api/health` エンドポイントが実装されている
3. ヘルスチェックレスポンスは以下を含む：
   ```json
   {
     "status": "ok",
     "timestamp": "2024-01-15T10:30:45Z",
     "uptime": 3600
   }
   ```
4. `GET /admin/logs` エンドポイントが実装されている
5. KV Store から監査ログを取得し、JSON 配列で返す
6. ログはタイムスタンプの降順（新しい順）で返される
7. オプションで `?limit=100` クエリパラメータでログ件数を制限可能
8. GET /admin/logs はセキュリティのため、管理用パスワード検証が必要（実装は optional）
9. エンドポイントは src/index.ts のルーティングに統合される

**成果物**:
- backend/src/handlers/admin.ts
- backend/src/handlers/admin.test.ts

---

#### 2.10 メインエントリーポイント統合
**優先度**: CRITICAL  
**見積もり**: 3 時間  
**先行タスク**: 2.8, 2.9

**説明**:
`backend/src/index.ts` にすべてのハンドラーと ミドルウェアを統合し、Workers の fetch ハンドラーを完成させます。

**受け入れ基準**:
1. `src/index.ts` が Workers の fetch ハンドラーを export
2. ルーティング機構が実装され、以下エンドポイントがマップされている：
   - POST /api/registration/register → registrationHandler
   - GET /api/health → healthHandler
   - GET /admin/logs → logsHandler
   - OPTIONS /* → CORS preflight
3. グローバル認証ミドルウェア（CORS など）が設定されている
4. エラーハンドリングがグローバルレベルで実装されている
5. 無効なエンドポイントに対して 404 を返す
6. `wrangler dev` でローカルデバッグサーバーが正常に起動
7. すべてのエンドポイントが cURL/Postman でテスト可能

**成果物**:
- backend/src/index.ts（完成版）

---

#### 2.11 Checkpoint - バックエンド機能確認
**優先度**: CRITICAL  
**見積もり**: 1 時間  
**先行タスク**: 2.10

**説明**:
バックエンド実装の全機能が期待通りに動作することを確認。

**受け入れ基準**:
1. すべてのユニットテストが成功（npm run test backend）
2. 統合テストがローカル環境で成功（wrangler dev）
3. 以下のエンドポイントが手動テストで動作確認：
   - POST /api/registration/register（正常系と異常系）
   - GET /api/health
   - GET /admin/logs
4. KV Store に登録レコードと監査ログが正しく保存されている
5. エラーメッセージが明確で、ユーザー向けメッセージがわかりやすい
6. パフォーマンステスト（応答時間 < 3 秒）を実施

---

### 3. フロントエンド実装

#### 3.1 QRScanner コンポーネント実装（第1段階）
**優先度**: CRITICAL  
**見積もり**: 4 時間  
**先行タスク**: 1.2

**説明**:
Camera API と jsQR ライブラリを使用して QRコード読取コンポーネントを実装します。

**受け入れ基準**:
1. `frontend/src/components/QRScanner.vue` が作成されている
2. ユーザー許可リクエスト後、リアルタイムでカメラ映像を表示
3. Canvas にビデオフレームを描画
4. jsQR ライブラリで QRコードを検出
5. QRコード検出時に QRコードデータを親コンポーネントに emit
6. カメラアクセス拒否時にエラーメッセージを表示
7. 複数の QRコードが同時検出される場合、最初のみ処理
8. 100ms 以内に検出・emit される（要件 1.4）
9. スタイリング：カメラプレビューが画面中央に表示され、モバイル対応
10. ユニットテスト（Vue Test Utils）で以下パターンをカバー：
    - カメラアクセス許可時
    - カメラアクセス拒否時
    - QRコード検出時
    - 複数 QRコード検出時

**受け入れ基準**（要件対応）:
- 要件 1: QRコード読み取り

**成果物**:
- frontend/src/components/QRScanner.vue
- frontend/src/components/QRScanner.test.ts

---

#### 3.2 API クライアント実装
**優先度**: CRITICAL  
**見積もり**: 2 時間  
**先行タスク**: 1.2

**説明**:
フロントエンドから Cloudflare Workers API を呼び出すためのクライアントを実装します。

**受け入れ基準**:
1. `frontend/src/services/api.ts` が作成されている
2. API_PASSWORD を Authorization ヘッダに含める処理が実装されている
3. API_BASE_URL を環境変数から読み込む処理が実装されている
4. `registerParticipant(qrCodeData, eventUrl)` 関数が実装されている
5. リトライ機構が実装されている（最大 3 回、指数バックオフ）
6. タイムアウト処理が実装されている（30 秒）
7. ネットワークエラーハンドリングが実装されている
8. エラーレスポンスから エラーコードと メッセージを抽出
9. 成功・失敗の両方でレスポンス結果を返す
10. TypeScript 型安全性：リクエスト・レスポンス型が定義されている

**成果物**:
- frontend/src/services/api.ts
- frontend/src/types/api.ts

---

#### 3.3 結果表示コンポーネント実装
**優先度**: CRITICAL  
**見積もり**: 3 時間  
**先行タスク**: 3.2

**説明**:
登録成功・失敗・ローディング状態を視覚的に表示するコンポーネント。

**受け入れ基準**:
1. `frontend/src/components/ResultDisplay.vue` が作成されている
2. 登録成功時（HTTP 200）：
   - 背景色が緑
   - ✓ マークと成功メッセージを表示
   - 成功音を再生（オプション）
   - 3 秒後に自動クリア
3. 登録失敗時（HTTP 4xx/5xx）：
   - 背景色が赤
   - ✗ マークとエラーメッセージを表示
   - エラーコード表示
   - ユーザー向けメッセージ（日本語）を表示
   - 5 秒後に自動クリア
4. ローディング状態：
   - スピナーアニメーションを表示
   - "登録処理中..." メッセージ
5. レスポンシブデザイン（モバイル・デスクトップ対応）
6. アクセシビリティ：ARIA ラベルを設定
7. スタイリングが落ち着いた UI になっている（過度なアニメーション避ける）

**受け入れ基準**（要件対応）:
- 要件 1: 結果表示

**成果物**:
- frontend/src/components/ResultDisplay.vue
- frontend/src/components/ResultDisplay.test.ts

---

#### 3.4 エラーメッセージコンポーネント
**優先度**: IMPORTANT  
**見積もり**: 2 時間  
**先行タスク**: 3.3

**説明**:
詳細なエラーメッセージと対応方法を表示するコンポーネント。

**受け入れ基準**:
1. `frontend/src/components/ErrorMessage.vue` が作成されている
2. 8 つのエラーコードに対応した日本語メッセージが定義されている：
   - INVALID_PASSWORD → "認証に失敗しました。パスワードを確認してください。"
   - PASSWORD_EXPIRED → "API パスワードの有効期限が切れています。管理者に連絡してください。"
   - INVALID_QR_FORMAT → "QRコードの形式が無効です。"
   - PARTICIPANT_NOT_FOUND → "このユーザーはイベント参加者一覧に見つかりません。"
   - ALREADY_REGISTERED → "このユーザーは既に登録済みです。"
   - SCRAPING_FAILED → "イベント情報の取得に失敗しました。管理者に報告してください。"
   - SESSION_EXPIRED → "セッションが期限切れになっています。ページをリロードしてください。"
   - NETWORK_ERROR → "インターネット接続を確認してください。"
3. エラーコードごとに推奨アクション（リトライ、管理者連絡など）を提示
4. ユーザーが「リトライ」ボタンでスキャン再開可能
5. メッセージの見出し、本文、アクションが明確に分離されている

**成果物**:
- frontend/src/components/ErrorMessage.vue
- frontend/src/components/ErrorMessage.test.ts
- frontend/src/constants/errorMessages.ts

---

#### 3.5 設定管理とロードプロセス
**優先度**: CRITICAL  
**見積もり**: 2 時間  
**先行タスク**: 1.2

**説明**:
環境変数の読み込み、設定管理、アプリケーション初期化を実装。

**受け入れ基準**:
1. `frontend/src/config.ts` が作成されている
2. 環境変数から以下を読み込む：
   - VITE_API_PASSWORD
   - VITE_API_BASE_URL
   - VITE_EVENT_URL
3. 開発環境と本番環境の自動判定が実装されている
4. 環境変数が不足している場合、明確なエラーメッセージを表示
5. Vite の環境変数サポート（import.meta.env）を使用
6. .env.local.example から実際の .env.local へのセットアップガイドが README に記載
7. `npm run dev` 実行時に環境変数チェックが行われる

**成果物**:
- frontend/src/config.ts
- frontend/.env.local.example

---

#### 3.6 App.vue ルートコンポーネント実装
**優先度**: CRITICAL  
**見積もり**: 3 時間  
**先行タスク**: 3.1, 3.3, 3.5

**説明**:
QRScanner、ResultDisplay、ErrorMessage コンポーネントを統合し、アプリケーション全体のフローを実装。

**受け入れ基準**:
1. `frontend/src/App.vue` が作成されている
2. 以下のコンポーネントを統合：
   - QRScanner（QRコード読取）
   - ResultDisplay（結果表示）
   - ErrorMessage（エラー表示）
3. フロー管理：
   - 初期状態：QRScanner 表示
   - QRコード検出時：API 呼び出し開始 → ResultDisplay に遷移
   - 成功時：成功メッセージ表示 → 3 秒後に QRScanner に戻る
   - 失敗時：エラーメッセージ表示 → ユーザーアクションで QRScanner に戻る
4. 状態管理（Vue ref）：
   - `isLoading`: ローディング状態
   - `result`: 登録結果
   - `error`: エラー情報
5. スタイリング：
   - レスポンシブレイアウト（モバイル優先）
   - 中央揃え、適切なパディング・マージン
   - 「受付システム」ヘッダーと基本情報表示
6. ページ背景色や全体デザインが落ち着いている

**成果物**:
- frontend/src/App.vue
- frontend/src/App.test.ts

---

#### 3.7 UI/UX 調整とスタイリング
**優先度**: IMPORTANT  
**見積もり**: 2 時間  
**先行タスク**: 3.6

**説明**:
レスポンシブデザイン、アクセシビリティ、ローディング状態を最適化。

**受け入れ基準**:
1. `frontend/src/styles/main.css` が作成されている
2. Tailwind CSS または純粋 CSS でスタイリング（プロジェクト方針に合わせて選択）
3. モバイル（320px）、タブレット（768px）、デスクトップ（1024px）で動作確認
4. ダークモード対応（オプション）
5. アクセシビリティ（WCAG 2.1 レベル AA）：
   - 色コントラスト比 4.5:1 以上
   - キーボード操作対応（タブキー、Enter キー）
   - ARIA ラベル・ロール設定
   - スクリーンリーダー対応テキスト
6. ローディング状態：スピナーアニメーション、プログレスバー
7. フォント、サイズ、行間が読みやすい
8. 視認性テスト（Chrome DevTools Lighthouse）でスコア 90 以上

**成果物**:
- frontend/src/styles/main.css
- frontend/public/index.html（アクセシビリティ対応）

---

#### 3.8 Checkpoint - フロントエンド機能確認
**優先度**: CRITICAL  
**見積もり**: 1 時間  
**先行タスク**: 3.7

**説明**:
フロントエンド実装の全機能が期待通りに動作することを確認。

**受け入れ基準**:
1. すべてのユニットテストが成功（npm run test frontend）
2. `npm run dev` でローカル開発サーバーが起動
3. ブラウザで http://localhost:5173 にアクセス可能
4. 以下の機能を手動確認：
   - カメラアクセス許可・拒否
   - QRコード読取（テスト用 QRコード使用）
   - API 呼び出しとレスポンス表示
   - 成功・失敗・エラー状態の表示
5. DevTools で Console エラーなし
6. Lighthouse パフォーマンステスト実施
7. 複数ブラウザ（Chrome, Safari, Firefox）で動作確認

---

### 4. インフラストラクチャ・デプロイメント

#### 4.1 Cloudflare KV Namespace 作成と設定
**優先度**: CRITICAL  
**見積もり**: 1.5 時間  
**先行タスク**: 1.3

**説明**:
Cloudflare Dashboard または Wrangler CLI を使用して 4 つの KV Namespace を作成し、wrangler.toml に設定。

**受け入れ基準**:
1. Cloudflare Dashboard または `wrangler kv:namespace create` で 4 つの namespace 作成：
   - CONNPASS_SESSION（セッション管理）
   - PARTICIPANTS_CACHE（参加者リストキャッシュ）
   - REGISTRATION_RECORDS（登録記録）
   - AUDIT_LOGS（監査ログ）
2. 各 namespace の ID を `wrangler.toml` の `[[kv_namespaces]]` に記載
3. `wrangler env production` 環境用の namespace も作成・設定
4. `wrangler kv:namespace list` で namespace 一覧が表示されることを確認
5. テスト：`wrangler dev` で KV 読み書き動作確認

**成果物**:
- wrangler.toml（namespace ID 設定済み）
- KV Namespace 設定ドキュメント

---

#### 4.2 Cloudflare Workers 環境変数・シークレット設定
**優先度**: CRITICAL  
**見積もり**: 2 時間  
**先行タスク**: 4.1

**説明**:
Cloudflare Workers の環境変数とシークレット（API パスワード、Google Sheets キーなど）を設定。

**受け入れ基準**:
1. ローカル開発用 `.env.local` が設定されている
2. 本番環境用の環境変数が `wrangler.toml` [env.production] に設定されている：
   - API_PASSWORD
   - API_PASSWORD_EXPIRY
   - FRONTEND_URL
   - GOOGLE_SHEET_ID
   - GOOGLE_SHEETS_API_KEY（シークレット）
   - CONNPASS_EMAIL（シークレット）
   - CONNPASS_PASSWORD（シークレット）
3. シークレット設定：`wrangler secret put API_PASSWORD --env production`
4. ローカル環境では `wrangler dev` で .env.local から読み込み
5. 本番環境では `wrangler secret list --env production` でシークレット確認可能
6. 環境変数が TypeScript の型に対応している（Env 型定義）

**成果物**:
- backend/.env.local.example
- wrangler.toml（環境変数設定済み）
- 環境変数セットアップドキュメント

---

#### 4.3 Vercel フロントエンドプロジェクト作成と設定
**優先度**: CRITICAL  
**見積もり**: 2 時間  
**先行タスク**: 1.2

**説明**:
Vercel Dashboard でフロントエンドプロジェクトを作成し、GitHub リポジトリと連携。

**受け入れ基準**:
1. Vercel Dashboard でプロジェクト作成
2. GitHub リポジトリと連携（自動デプロイ設定）
3. `frontend/` ディレクトリをビルドルートに設定
4. ビルドコマンドを `npm run build` に設定
5. 環境変数を Vercel Dashboard に設定：
   - VITE_API_PASSWORD
   - VITE_API_BASE_URL
   - VITE_EVENT_URL
6. `npm run build` でプロダクションビルド成功
7. `vercel deploy --prod` または Git push で自動デプロイ
8. デプロイ後の URL が CORS 設定で Cloudflare Workers に許可されている

**成果物**:
- Vercel プロジェクト設定（Dashboard）
- 自動デプロイ設定ドキュメント

---

#### 4.4 Cloudflare Workers デプロイメント設定
**優先度**: CRITICAL  
**見積もり**: 2 時間  
**先行タスク**: 4.1, 4.2

**説明**:
Cloudflare Workers を本番環境にデプロイするための設定を完成させます。

**受け入れ基準**:
1. `wrangler.toml` が完全に設定されている
2. `backend/` で `wrangler publish --env production` が成功
3. Cloudflare Dashboard でデプロイ履歴が表示される
4. Workers URL（https://api.your-domain.workers.dev）でエンドポイントが応答
5. `GET /api/health` で正常なレスポンスを確認
6. ローカルテスト `wrangler dev` と本番環境 `wrangler publish` が連動
7. ロールバック可能な仕組みが構築されている（git タグで本番版管理）

**成果物**:
- wrangler.toml（本番設定）
- デプロイメント手順ドキュメント

---

#### 4.5 Google Sheets API 認証設定
**優先度**: IMPORTANT  
**見積もり**: 1.5 時間  
**先行タスク**: 2.6

**説明**:
Google Sheets への登録データ自動保存のための API 認証を設定。

**受け入れ基準**:
1. Google Cloud Console でプロジェクト作成
2. Google Sheets API を有効化
3. サービスアカウントまたは API キーを生成
4. Google Sheets ファイル作成（テンプレート列含む）
5. サービスアカウントに Sheet への書き込み権限を付与
6. GOOGLE_SHEET_ID と GOOGLE_SHEETS_API_KEY を環境変数に設定
7. テスト：ローカルで `node backend/test-sheets.js` でテスト書き込み

**成果物**:
- Google Sheets API 設定ドキュメント
- テスト Google Sheet（テンプレート）

---

#### 4.6 DNS とカスタムドメイン設定（オプション）
**優先度**: OPTIONAL  
**見積もり**: 1 時間  
**先行タスク**: なし

**説明**:
カスタムドメイン（例：reception.example.com）を設定し、Vercel と Cloudflare Workers をルーティング。

**受け入れ基準**:
1. ドメイン登録者で DNS を管理
2. Vercel 側で カスタムドメイン追加（CNAME レコード）
3. Cloudflare 側で Workers ルートに /api/* をマッピング
4. HTTPS が自動で有効化される
5. `https://your-domain.com` で フロントエンドにアクセス
6. `https://your-domain.com/api/registration/register` で バックエンド呼び出し

**成果物**:
- DNS 設定ドキュメント
- ドメイン検証完了確認

---

#### 4.7 Checkpoint - デプロイメント確認
**優先度**: CRITICAL  
**見積もり**: 1.5 時間  
**先行タスク**: 4.3, 4.4

**説明**:
本番環境でのシステム全体の動作確認。

**受け入れ基準**:
1. Vercel フロントエンド URL にアクセス可能
2. Cloudflare Workers バックエンド URL にアクセス可能
3. フロントエンドから バックエンド API への呼び出しが成功
4. 以下フロー全体が本番環境で動作：
   - QRコード読取 → API 呼び出し → Connpass 検証 → 登録 → Google Sheets 保存
5. Google Sheets に新しい行が追記される
6. 監査ログが KV Store に記録される
7. エラーシナリオも確認（不正なパスワード、未登録参加者など）
8. Lighthouse パフォーマンステスト（本番 URL）

---

### 5. テスト・品質保証

#### 5.1 ユニットテスト実装（バックエンド）
**優先度**: IMPORTANT  
**見積もり**: 4 時間  
**先行タスク**: 2.1-2.7

**説明**:
バックエンドのミドルウェア、サービス、ハンドラーのユニットテストを実装。

**受け入れ基準**:
1. `npm run test` で全ユニットテスト実行
2. テストフレームワーク：Jest
3. 以下の機能を 90% 以上のカバレッジでテスト：
   - auth.ts：パスワード検証、有効期限チェック
   - connpass.ts：HTML パース、ネットワークエラー
   - registration.ts：参加者照合、二重登録チェック
   - cache.ts：KV 読み書き、TTL
   - storage.ts：Google Sheets API、リトライ
   - audit.ts：ログ記録、機密情報除外
4. モック：Google Sheets API、KV Store、fetch
5. エッジケース：タイムアウト、ネットワーク遅延、パースエラー
6. テスト結果が `backend/coverage/` に出力される

**成果物**:
- backend/src/**/*.test.ts（各モジュール）
- jest.config.js
- テスト結果レポート

---

#### 5.2 ユニットテスト実装（フロントエンド）
**優先度**: IMPORTANT  
**見積もり**: 3 時間  
**先行タスク**: 3.1-3.6

**説明**:
フロントエンドのコンポーネント、サービスのユニットテストを実装。

**受け入れ基準**:
1. `npm run test` で全ユニットテスト実行
2. テストフレームワーク：Vitest + Vue Test Utils
3. 以下のコンポーネントを 85% 以上のカバレッジでテスト：
   - QRScanner.vue：カメラアクセス、QRコード検出
   - ResultDisplay.vue：成功・失敗表示、タイマー
   - ErrorMessage.vue：エラーメッセージ表示
   - App.vue：フロー制御
4. api.ts：API 呼び出し、リトライ、タイムアウト
5. モック：Camera API、jsQR、fetch
6. ユーザーインタラクション：クリック、フォーカス
7. 非同期処理：Promise、async/await

**成果物**:
- frontend/src/**/*.test.ts（各モジュール）
- vitest.config.ts
- テスト結果レポート

---

#### 5.3 統合テスト実装
**優先度**: IMPORTANT  
**見積もり**: 3 時間  
**先行タスク**: 3.8, 2.11

**説明**:
ローカル環境でフロントエンド＋バックエンド＋ストレージの全体統合テストを実装。

**受け入れ基準**:
1. テストスイート：`npm run test:integration`
2. テスト環境：ローカル（wrangler dev + npm run dev）
3. テスト内容：
   - 正常な登録フロー（QRコード読取 → API 呼び出し → 登録成功）
   - 参加者未検出フロー
   - ネットワークエラーと自動リトライ
   - タイムアウト処理
   - 二重登録防止
   - Google Sheets への保存確認
4. テストデータ：Connpass テストイベント（小規模）
5. テスト結果：レポート出力（HTML + JSON）

**成果物**:
- tests/integration/full-flow.test.ts
- テスト実行スクリプト（npm run test:integration）

---

#### 5.4 E2E テスト・受け入れテスト
**優先度**: IMPORTANT  
**見積もり**: 2 時間  
**先行タスク**: 4.7

**説明**:
本番環境に近い環境での end-to-end テスト。実際の QRコード・Connpass イベントを使用。

**受け入れ基準**:
1. テストツール：Playwright または Cypress
2. テストシナリオ：
   - ブラウザでアプリケーション起動
   - カメラから QRコード読取
   - 登録完了メッセージ確認
   - 複数連続スキャン
   - エラーハンドリング（不正なパスワード等）
3. テストリポート：スクリーンショット・ビデオ記録
4. テストデータ：実際のイベント参加者（または テスト用ダミーイベント）
5. 手動受け入れテストチェックリストも作成

**成果物**:
- tests/e2e/full-flow.spec.ts
- E2E テスト実行ガイド

---

#### 5.5 パフォーマンス・セキュリティテスト
**優先度**: IMPORTANT  
**見積もり**: 2 時間  
**先行タスク**: 4.7

**説明**:
パフォーマンステスト（応答時間、スループット）とセキュリティテスト（認証、CORS）を実施。

**受け入れ基準**:
1. パフォーマンステスト：
   - API 応答時間 < 3 秒（キャッシュヒット時 < 200ms）
   - 同時 10 リクエストでのスループット
   - Lighthouse スコア 85 以上（フロント）
2. セキュリティテスト：
   - API パスワード不正時に 401 エラー
   - CORS ヘッダが正しく設定されている
   - Google Sheets API キーがログに含まれない
   - SQL インジェクション、XSS 攻撃に対する耐性
3. 負荷テスト（オプション）：
   - 同時 100 ユーザーでの安定性
   - KV Store 容量確認

**成果物**:
- パフォーマンステスト結果ドキュメント
- セキュリティテストレポート

---

#### 5.6 Checkpoint - すべてのテスト完了
**優先度**: CRITICAL  
**見積もり**: 1 時間  
**先行タスク**: 5.1-5.5

**説明**:
すべてのテストが成功し、品質要件を満たすことを確認。

**受け入れ基準**:
1. ユニットテスト：合計成功率 98% 以上
2. 統合テスト：全シナリオ成功
3. E2E テスト：受け入れ基準をすべて確認
4. パフォーマンス：応答時間が要件内
5. セキュリティ：脆弱性なし
6. テストカバレッジ：コード全体で 85% 以上
7. テスト結果ドキュメント：最終レポート作成

---

### 6. ドキュメント・運用ガイド（オプション）

#### 6.1 開発者向けセットアップガイド
**優先度**: OPTIONAL  
**見積もり**: 2 時間  
**先行タスク**: すべての実装完了後

**説明**:
新しい開発者が環境構築できるための詳細ガイド。

**成果物**:
- docs/DEVELOPMENT.md
  - 環境変数設定
  - ローカル開発サーバー起動
  - テスト実行方法
  - ビルド方法
  - デバッグ方法

---

#### 6.2 API ドキュメント
**優先度**: OPTIONAL  
**見積もり**: 1.5 時間  
**先行タスク**: 2.10

**説明**:
API エンドポイント、リクエスト・レスポンス形式、エラーコードを詳細記載。

**成果物**:
- docs/API.md
  - POST /api/registration/register
  - GET /api/health
  - GET /admin/logs
  - 全エラーコード・メッセージ一覧

---

#### 6.3 デプロイメント・運用ガイド
**優先度**: OPTIONAL  
**見積もり**: 1.5 時間  
**先行タスク**: 4.7

**説明**:
本番環境へのデプロイ、トラブルシューティング、ホットフィックス手順。

**成果物**:
- docs/DEPLOYMENT.md
  - Vercel デプロイ手順
  - Workers デプロイ手順
  - ロールバック手順
  - 環境変数更新方法
  - トラブルシューティング集

---

#### 6.4 受付スタッフ向け操作ガイド
**優先度**: OPTIONAL  
**見積もり**: 1 時間  
**先行タスク**: 4.7

**説明**:
イベント現場での操作マニュアル。

**成果物**:
- docs/USER_GUIDE.md
  - アプリケーション起動方法
  - QRコード読取手順
  - 成功・エラー時の対応
  - FAQ

---

## タスク依存関係グラフ

```json
{
  "waves": [
    {
      "id": 0,
      "name": "環境構築",
      "tasks": ["1.1", "1.2", "1.3"]
    },
    {
      "id": 1,
      "name": "初期化・依存関係インストール",
      "tasks": ["1.4", "1.5", "2.2", "3.1"]
    },
    {
      "id": 2,
      "name": "バックエンド基盤",
      "tasks": ["2.1", "2.4", "2.7"]
    },
    {
      "id": 3,
      "name": "バックエンドビジネスロジック",
      "tasks": ["2.3", "2.5", "2.6"]
    },
    {
      "id": 4,
      "name": "フロントエンド基盤",
      "tasks": ["3.2", "3.5"]
    },
    {
      "id": 5,
      "name": "バックエンド API",
      "tasks": ["2.8", "2.9"]
    },
    {
      "id": 6,
      "name": "フロントエンド UI",
      "tasks": ["3.3", "3.4", "3.6"]
    },
    {
      "id": 7,
      "name": "バックエンド統合",
      "tasks": ["2.10", "2.11"]
    },
    {
      "id": 8,
      "name": "フロントエンド最適化",
      "tasks": ["3.7", "3.8"]
    },
    {
      "id": 9,
      "name": "インフラ構築",
      "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5"]
    },
    {
      "id": 10,
      "name": "デプロイメント確認",
      "tasks": ["4.6", "4.7"]
    },
    {
      "id": 11,
      "name": "テスト実装",
      "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5"]
    },
    {
      "id": 12,
      "name": "テスト最終確認",
      "tasks": ["5.6"]
    },
    {
      "id": 13,
      "name": "ドキュメント（オプション）",
      "tasks": ["6.1", "6.2", "6.3", "6.4"]
    }
  ]
}
```

---

## タスク実行の注意点

### 実装順序の重要ポイント

1. **Wave 0-2**: 環境構築と基盤整備
   - 並列実行可能
   - すべてのタスクの先行条件

2. **Wave 3-4**: バックエンド・フロントエンド開発
   - バックエンド（Wave 3-5）とフロント（Wave 4-6）は並列実行可能
   - ただし、API 定義は先に確定させておく

3. **Wave 7-8**: 統合テスト準備
   - バックエンド・フロントエンドがともに完成してから

4. **Wave 9-10**: インフラ・デプロイ
   - コード実装完了後
   - 本番環境の準備

5. **Wave 11-13**: テスト・ドキュメント
   - 最終フェーズ
   - リリース前必須

### タスク実行時の確認事項

- 各タスク完了時に「受け入れ基準」をすべてチェック
- 先行タスクが完全に完了してから次のタスクを開始
- ユニットテストは実装と同時に作成
- コードレビューを定期的に実施
- 要件との対応関係を確認

---

## 見積もり時間サマリー

| 段階 | タスク数 | 小計 | 累計 |
|---|---|---|---|
| 1. セットアップ | 5 | 8 時間 | 8 時間 |
| 2. バックエンド | 10 | 25 時間 | 33 時間 |
| 3. フロントエンド | 8 | 17 時間 | 50 時間 |
| 4. インフラ・デプロイ | 7 | 11 時間 | 61 時間 |
| 5. テスト | 6 | 15 時間 | 76 時間 |
| 6. ドキュメント | 4 | 6 時間 | **82 時間** |

**推奨実装期間**: 3-4 週間（1 日 6-8 時間作業時間）

