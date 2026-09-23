# イベント参加用 QRコード受付システム - 技術設計書

## 概要

本システムは、イベント会場での参加者受付を効率化するための Web アプリケーションです。受付スタッフがブラウザ上で QRコードを読み取り、その情報を API パスワードで保護されたバックエンドに送信して、Connpass イベントの参加者一覧と照合し、登録結果を表示します。

### キーアーキテクチャ決定

- **認証方式**: API パスワードベース（HTTP Authorization ヘッダ）- シンプル且つ複数端末での運用に適切
- **セッション管理**: バックエンド側で Connpass 共通アカウントのセッションをメモリに保持 - 受付端末ごとのセッション管理は不要
- **QRコード検証**: バックエンド側で Connpass をスクレイピングして参加者一覧を取得 - フロントエンドは読み取り UI のみ
- **スケーラビリティ**: 複数受付端末からの同時リクエストに対応する設計

---

## アーキテクチャ

```
┌─────────────────────────┐
│   フロントエンド層      │
│   (複数受付端末)        │
│  ┌─────────────────┐   │
│  │ QRコード読取UI  │   │
│  │ (Vue/React等)  │   │
│  └────────┬────────┘   │
└───────────┼─────────────┘
            │ HTTP Request
            │ (QRコード + イベントURL)
            │ + Authorization: Bearer {API_PASSWORD}
            ↓
┌─────────────────────────────────────┐
│   バックエンド層 (Node.js/Python)   │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │ API パスワード検証          │   │
│  │ ミドルウェア                │   │
│  │ - Authorization ヘッダ確認  │   │
│  │ - 有効期限チェック          │   │
│  └────────────┬────────────────┘   │
│               ↓                     │
│  ┌─────────────────────────────┐   │
│  │ Registration API            │   │
│  │ POST /api/registration/     │   │
│  │       register              │   │
│  └────────────┬────────────────┘   │
│               ↓                     │
│  ┌──────────────────────────────────────┐  │
│  │ Registration Service                 │  │
│  │ - QRコード形式検証                   │  │
│  │ - Connpass スクレイピング実行        │  │
│  │ - 参加者一覧との照合                 │  │
│  │ - 登録結果の返却                     │  │
│  └────────────┬─────────────────────────┘  │
│               ↓                            │
│  ┌──────────────────────────────────────┐  │
│  │ Connpass Session Manager             │  │
│  │ - 共通アカウントセッション管理       │  │
│  │ - セッション自動再ログイン           │  │
│  │ - メモリ内セッション保持             │  │
│  └────────────┬─────────────────────────┘  │
│               ↓                            │
│  ┌──────────────────────────────────────┐  │
│  │ Audit System                         │  │
│  │ - 全リクエストのログ記録             │  │
│  │ - エラー詳細の記録                   │  │
│  └──────────────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
            │
            ↓
┌─────────────────────────────────────┐
│  外部サービス層                     │
├─────────────────────────────────────┤
│  - Connpass （www.connpass.com）    │
│    → イベント参加者一覧をスクレイピング
│  - ログファイルまたはDB             │
└─────────────────────────────────────┘
```

---

## コンポーネントと インターフェース

### 1. API パスワード検証ミドルウェア (Authentication Middleware)

**責務**: すべてのリクエストに対して API パスワードと有効期限を検証

**実装仕様**:
- Authorization ヘッダから Bearer トークン（パスワード）を抽出
- 環境変数 `API_PASSWORD` と照合
- 環境変数 `API_PASSWORD_EXPIRY` と現在時刻を比較
- 検証失敗時は 401 Unauthorized を返す

**インターフェース**:

```javascript
// リクエスト例
Authorization: Bearer ${API_PASSWORD}

// レスポンス（成功）
HTTP 200
{
  "success": true,
  "message": "Authentication successful"
}

// レスポンス（失敗 - パスワード不正）
HTTP 401
{
  "error": "INVALID_PASSWORD",
  "message": "Authentication failed: Invalid API password"
}

// レスポンス（失敗 - 期限切れ）
HTTP 401
{
  "error": "PASSWORD_EXPIRED",
  "message": "Authentication failed: API password has expired"
}
```

**環境変数**:
```
API_PASSWORD=your_secure_password_here
API_PASSWORD_EXPIRY=2024-12-31T23:59:59Z
```

---

### 2. Registration Service

**責務**: QRコードデータと Connpass イベント URL を受け取り、参加者一覧との照合を実行

**実装仕様**:

#### 入力パラメータ

```javascript
{
  "qrCodeData": "user123",        // QRコードから抽出されたユーザー名
  "eventUrl": "https://www.connpass.com/event/xxxxx/"  // Connpass イベント URL
}
```

#### 処理フロー

1. **QRコード形式検証**
   - `qrCodeData` が空でないことを確認
   - `eventUrl` が有効な Connpass URL 形式であることを確認
   - 無効な場合: エラー `INVALID_QR_FORMAT` を返す

2. **Connpass セッション確認**
   - Connpass Session Manager からセッション情報を取得
   - セッションが無効な場合: 自動的に再ログイン

3. **参加者一覧のスクレイピング**
   - `eventUrl` にアクセス（Puppeteer または jsdom を使用）
   - 参加者の一覧テーブルから全ユーザー名を抽出
   - スクレイピング失敗時: エラー `SCRAPING_FAILED` を返す

4. **参加者照合**
   - 抽出した参加者一覧から `qrCodeData` を検索
   - マッチした場合: `REGISTRATION_SUCCESS` を返す
   - マッチしない場合: エラー `PARTICIPANT_NOT_FOUND` を返す

#### 出力レスポンス

```javascript
// 成功時
HTTP 200
{
  "success": true,
  "status": "REGISTRATION_SUCCESS",
  "message": "参加者が確認されました",
  "participant": {
    "username": "user123",
    "eventUrl": "https://www.connpass.com/event/xxxxx/",
    "registeredAt": "2024-01-15T10:30:45Z"
  }
}

// 失敗時（参加者未検出）
HTTP 400
{
  "success": false,
  "status": "PARTICIPANT_NOT_FOUND",
  "message": "このユーザーはイベント参加者一覧に見つかりません",
  "error": "PARTICIPANT_NOT_FOUND"
}

// 失敗時（無効な QRコード形式）
HTTP 400
{
  "success": false,
  "status": "INVALID_QR_FORMAT",
  "message": "QRコードの形式が無効です",
  "error": "INVALID_QR_FORMAT"
}

// 失敗時（スクレイピング失敗）
HTTP 500
{
  "success": false,
  "status": "SCRAPING_FAILED",
  "message": "イベント情報の取得に失敗しました",
  "error": "SCRAPING_FAILED"
}
```

---

### 3. Connpass Session Manager

**責務**: バックエンド起動時に Connpass 共通アカウントでログインし、セッション情報をメモリに保持・管理

**実装仕様**:

#### 初期化

- バックエンド起動時に以下を実行:
  - 環境変数から Connpass ログイン情報 (`CONNPASS_EMAIL`, `CONNPASS_PASSWORD`) を取得
  - Puppeteer で Connpass にログイン
  - セッション情報（Cookie など）をメモリに保持

#### セッション有効期限管理

- セッションの有効期限: 環境変数 `CONNPASS_SESSION_EXPIRY` で設定（例: 24 時間）
- 有効期限に到達した場合: 自動的に再ログイン
- 複数受付端末からの同時リクエストに対応: ミューテックス/ロック機構を導入

#### メモリ内データ構造

```javascript
{
  sessionId: "unique_session_id",
  email: "conpass_account@example.com",
  isLoggedIn: true,
  lastLoginAt: "2024-01-15T08:00:00Z",
  expiresAt: "2024-01-16T08:00:00Z",
  cookies: [/* Puppeteer からの Cookie 情報 */],
  isRefreshing: false  // 再ログイン中フラグ
}
```

#### 操作インターフェース

```javascript
// セッション情報取得
async getSession() -> { sessionId, isLoggedIn, expiresAt }

// セッション有効性確認
async isSessionValid() -> boolean

// 必要に応じて再ログイン
async ensureSessionValid() -> void
```

---

### 4. Registration API エンドポイント

**エンドポイント**: `POST /api/registration/register`

**認証**: Authorization ヘッダ（API パスワード）で保護

**リクエストボディ**:

```javascript
{
  "qrCodeData": "user123",
  "eventUrl": "https://www.connpass.com/event/xxxxx/"
}
```

**レスポンス**: Registration Service が返す結果（前述）

**フロー**:

```
1. Authorization ヘッダ検証 (ミドルウェア)
   ↓
2. リクエスト解析
   ↓
3. Registration Service 実行
   ↓
4. 結果返却 + Audit ログ記録
```

---

## データモデル

### QRコード登録レコード (Registration Record)

```javascript
{
  id: "unique_id",
  username: "user123",
  eventUrl: "https://www.connpass.com/event/xxxxx/",
  registrationStatus: "SUCCESS" | "FAILED",
  errorCode: null | "PARTICIPANT_NOT_FOUND" | "INVALID_QR_FORMAT" | "SCRAPING_FAILED",
  errorMessage: "",
  registeredAt: "2024-01-15T10:30:45Z",
  ipAddress: "192.168.1.100"
}
```

### Connpass セッション情報

```javascript
{
  sessionId: "unique_session_id",
  email: "connpass_account@example.com",
  isLoggedIn: true,
  loginCount: 1,
  lastLoginAt: "2024-01-15T08:00:00Z",
  expiresAt: "2024-01-16T08:00:00Z",
  cookies: [
    { name: "session_id", value: "...", domain: "www.connpass.com" },
    // ... 他の Cookie
  ]
}
```

### API パスワード設定

```javascript
{
  password: "secure_password_hash",
  expiresAt: "2024-12-31T23:59:59Z",
  isActive: true,
  createdAt: "2024-01-01T00:00:00Z"
}
```

---

## エラーハンドリング

### エラーコード一覧

| エラーコード | HTTP ステータス | 説明 | ユーザーメッセージ |
|---|---|---|---|
| `INVALID_PASSWORD` | 401 | API パスワードが不正 | 認証に失敗しました。パスワードを確認してください。 |
| `PASSWORD_EXPIRED` | 401 | API パスワードが期限切れ | API パスワードの有効期限が切れています。管理者に連絡してください。 |
| `INVALID_QR_FORMAT` | 400 | QRコード形式が無効 | QRコードの形式が無効です。 |
| `PARTICIPANT_NOT_FOUND` | 400 | 参加者が見つからない | このユーザーはイベント参加者一覧に見つかりません。二重登録はできません。 |
| `SCRAPING_FAILED` | 500 | スクレイピング失敗 | イベント情報の取得に失敗しました。管理者に報告してください。 |
| `SESSION_EXPIRED` | 500 | Connpass セッション期限切れ | セッションが期限切れになっています。システムを再起動してください。 |
| `NETWORK_ERROR` | 500 | ネットワーク接続エラー | インターネット接続を確認してください。 |
| `INTERNAL_SERVER_ERROR` | 500 | 予期しないエラー | 予期しないエラーが発生しました。システム管理者に連絡してください。 |

### エラーレスポンス形式

```javascript
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "ユーザー向けメッセージ",
  "details": {
    "timestamp": "2024-01-15T10:30:45Z",
    "path": "/api/registration/register",
    "method": "POST"
  }
}
```

### リトライ戦略

- **Connpass スクレイピング失敗**: 最大 3 回までリトライ（100ms 間隔）
- **Connpass セッション期限切れ**: 自動再ログイン
- **ネットワークエラー**: クライアント側でリトライ（指数バックオフ推奨）

---

## テスト戦略

### ユニットテスト

#### 1. API パスワード検証ミドルウェア

- ✅ 正しいパスワードでリクエスト → 通過
- ✅ 不正なパスワードでリクエスト → 401 エラー
- ✅ 期限切れパスワード → 401 エラー
- ✅ Authorization ヘッダなし → 401 エラー

#### 2. Registration Service

- ✅ 有効な QRコード + 参加者が存在 → REGISTRATION_SUCCESS
- ✅ 有効な QRコード + 参加者が未検出 → PARTICIPANT_NOT_FOUND
- ✅ 無効な QRコード形式 → INVALID_QR_FORMAT
- ✅ 無効なイベント URL → スクレイピング失敗エラー

#### 3. Connpass Session Manager

- ✅ 初期化時にログイン成功 → セッション情報をメモリに保持
- ✅ セッション有効期限内でのリクエスト → セッション使用
- ✅ セッション有効期限切れ → 自動再ログイン
- ✅ 複数同時リクエスト → ミューテックスでセーフティ保証

### 統合テスト

- ✅ API パスワード検証 + Registration Service の統合動作
- ✅ Connpass セッション管理と Registration Service の統合動作
- ✅ エラー発生時の正しいエラーレスポンス返却
- ✅ 複数受付端末からの同時リクエスト処理

### 受け入れテスト

- ✅ QRコード読み取り → バックエンド登録 → 結果表示（E2E）
- ✅ ネットワーク障害時のエラーハンドリング
- ✅ 複数のイベント URL に対応

---

## セキュリティ考慮事項

### 1. API パスワード保護

- **環境変数での管理**: ソースコードに直接記述しない
- **HTTPS/TLS**: すべての通信を暗号化
- **有効期限**: パスワード有効期限を設定して定期更新

### 2. Connpass アカウント情報

- **環境変数での管理**: ログイン情報をソースコードに含めない
- **メモリ内保持**: セッション情報は永続化しない

### 3. スクレイピング安全性

- **User-Agent 設定**: Puppeteer の User-Agent を適切に設定
- **アクセス頻度制限**: Connpass サーバーへの過度なアクセスを避ける
- **利用規約遵守**: Connpass の利用規約に従う

### 4. ロギング

- **機密情報の除外**: パスワード、個人情報をログに出力しない
- **監査証跡**: すべてのリクエスト・レスポンスを記録

---

## パフォーマンス最適化

### 1. Connpass セッションのメモリ保持

- バックエンド起動時に 1 回だけログイン
- 複数の受付端末から再利用 → Puppeteer の起動コストを削減
- セッション有効期限まで再ログイン不要

### 2. スクレイピング最適化

- キャッシング: 同じイベント URL への短時間内のリクエストはキャッシュ結果を返す（TTL: 5-10 秒）
- 並列処理: 複数の受付端末からの同時リクエストをキューイングして処理

### 3. 応答時間目標

- API パスワード検証: < 10ms
- QRコード登録処理: < 2 秒（Connpass スクレイピング含む）
- キャッシュ使用時: < 500ms

---

## デプロイ・運用考慮事項

### 環境変数設定

```bash
# Connpass アカウント情報
CONNPASS_EMAIL=your_email@example.com
CONNPASS_PASSWORD=your_password

# API パスワード
API_PASSWORD=your_secure_password_here
API_PASSWORD_EXPIRY=2024-12-31T23:59:59Z

# Connpass セッション有効期限
CONNPASS_SESSION_EXPIRY=86400000  # ミリ秒単位（24 時間）

# ログレベル
LOG_LEVEL=info
```

### バックエンド起動時の初期化チェック

1. 環境変数の確認 (すべて設定されているか)
2. Connpass へのネットワーク接続確認
3. Connpass ログイン試行
4. セッション情報をメモリに保持
5. 準備完了ログ出力

### ヘルスチェックエンドポイント

```javascript
GET /api/health
{
  "status": "ok",
  "connpassSession": {
    "isValid": true,
    "expiresAt": "2024-01-16T08:00:00Z"
  },
  "timestamp": "2024-01-15T10:30:45Z"
}
```

---

## フロントエンド側の要件

### 実装範囲

1. **QRコード読み取り UI**
   - ブラウザの Camera API を使用してリアルタイムカメラ映像を表示
   - jsQR、zbar.js などのライブラリで QRコード検出

2. **API リクエスト送信**
   ```javascript
   const response = await fetch('/api/registration/register', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${API_PASSWORD}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       qrCodeData: extractedUserName,
       eventUrl: selectedEventUrl
     })
   });
   ```

3. **結果表示**
   - 登録成功: 緑色フレーム + 成功音
   - 登録失敗: 赤色フレーム + エラーメッセージ表示
   - レスポンス時間: < 100ms

### 環境変数（フロントエンド側）

```javascript
// .env.local
VITE_API_PASSWORD=your_secure_password_here
VITE_API_BASE_URL=https://api.your-domain.com
```

---

## 今後の拡張可能性

1. **複数イベント対応**: 異なるイベント URL に同時対応
2. **QRコード生成**: 参加者用 QRコード生成機能
3. **統計ダッシュボード**: リアルタイム登録状況の表示
4. **Google スプレッドシート連携**: 登録情報の自動保存
5. **モバイルアプリ化**: React Native / Flutter での実装
6. **複数言語対応**: 日本語以外のメッセージ

---

## まとめ

このシステムは、シンプルかつセキュアな API パスワード認証と、バックエンド側の Connpass 共有セッション管理を組み合わせることで、複数の受付端末からの同時リクエストに対応しながら、受付スタッフセッションの管理複雑性を排除しています。

フロントエンドは QRコード読み取り UI のみに専念でき、バックエンド側は Connpass との連携とスクレイピングを一元管理することで、保守性と拡張性に優れた設計となっています。
