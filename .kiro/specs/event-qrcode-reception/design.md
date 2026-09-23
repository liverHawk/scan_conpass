# イベント参加用 QRコード受付システム - 技術設計書
## Vercel + Cloudflare Workers 無料環境最適化版

## 概要

本システムは、**Vercel** と **Cloudflare Workers** を組み合わせた完全無料の Web アプリケーションです。受付スタッフがブラウザ上で QRコードを読み取り、API パスワードで保護されたバックエンドに送信して、Connpass イベントの参加者一覧と照合し、登録結果を表示します。

### キーアーキテクチャ決定

| 項目 | 決定 | 理由 |
|---|---|---|
| **フロントエンドホスティング** | Vercel | 無料（帯域幅 100GB/月）、Git 連携自動デプロイ、Vue/React サポート |
| **バックエンドホスティング** | Cloudflare Workers | 無料（100,000 リクエスト/日）、30 秒タイムアウト、低遅延 |
| **データストレージ** | Cloudflare KV Store | 無料（100k 読込/日、10k 書込/日）、Workers ネイティブ |
| **セッション管理** | KV Store + メモリ | Puppeteer Session 情報を KV に保存、Workers プロセス内キャッシュ |
| **スクレイピング** | fetch + Cheerio | 軽量、Workers で実行可能、Puppeteer より高速 |
| **ロギング** | KV Store + Google Sheets | Workers 内で管理、永続ストレージは Google Sheets API |
| **認証方式** | API パスワード | シンプル、複数端末対応、複雑なセッション管理不要 |

---

## アーキテクチャ

```
┌──────────────────────────────────────────┐
│         Vercel（フロントエンド）        │
│                                          │
│  ┌─────────────────────────────────┐   │
│  │   Vue/React SPA                 │   │
│  │   - QRコード読取 UI             │   │
│  │   - jsQR ライブラリ使用         │   │
│  │   - Camera API 統合             │   │
│  │   - fetch で Worker API 呼び出し│   │
│  └──────────────┬──────────────────┘   │
│  https://your-domain.vercel.app         │
└──────────────────┬───────────────────────┘
                   │ HTTPS Request
                   │ Authorization: Bearer {API_PASSWORD}
                   │ {qrCodeData, eventUrl}
                   ↓
┌──────────────────────────────────────────────────────────┐
│    Cloudflare Workers（バックエンド）                    │
│    https://api.your-domain.workers.dev                   │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Routing                                             │ │
│  │ - POST /api/registration/register                   │ │
│  │ - GET /api/health                                   │ │
│  │ - GET /admin/logs (管理画面)                        │ │
│  └──────────┬──────────────────────────────────────────┘ │
│             ↓                                             │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Authentication Middleware                           │ │
│  │ - Authorization ヘッダ検証                          │ │
│  │ - API_PASSWORD 確認                                │ │
│  │ - 有効期限チェック                                  │ │
│  └──────────┬──────────────────────────────────────────┘ │
│             ↓                                             │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Registration Handler                                │ │
│  │ - QRコード形式検証                                  │ │
│  │ - Connpass Session 確認 (KV から取得)             │ │
│  │ - fetch でイベント URL を取得                      │ │
│  │ - Cheerio で参加者一覧をパース                     │ │
│  │ - 正規表現で user 抽出                             │ │
│  │ - qrCodeData と照合                               │ │
│  │ - 登録結果を KV に記録                             │ │
│  └──────────┬──────────────────────────────────────────┘ │
│             ↓                                             │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Async Storage Writer (非ブロッキング)              │ │
│  │ - Google Sheets API に非同期で保存                │ │
│  │ - ファイルロック対応                                │ │
│  │ - リトライ最大 3 回                                │ │
│  └─────────────────────────────────────────────────────┘ │
│             ↓                                             │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Cloudflare KV Namespaces                            │ │
│  │ - connpass:session:main (Connpass Session)         │ │
│  │ - connpass:participants:{eventId} (Cache)          │ │
│  │ - registration:records:{date} (Logs)               │ │
│  │ - audit:log (Audit Trail)                          │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
└──────────┬──────────────────────────────────────┬─────────┘
           ↓                                      ↓
    ┌─────────────────┐               ┌──────────────────────┐
    │ Connpass        │               │ Google Sheets        │
    │ www.connpass.com│               │ (Permanent Storage)  │
    └─────────────────┘               └──────────────────────┘
```

---

## デプロイメント構成

### フロントエンド（Vercel）

```
プロジェクト構成:
frontend/
├── src/
│   ├── components/
│   │   ├── QRScanner.vue          # QRコード読取コンポーネント
│   │   ├── ResultDisplay.vue      # 登録結果表示
│   │   └── ErrorMessage.vue       # エラーメッセージ
│   ├── App.vue                    # ルートコンポーネント
│   ├── main.js                    # エントリーポイント
│   └── config.ts                  # API 設定
├── public/
│   └── favicon.ico
├── vite.config.js                 # Vite 設定
├── vercel.json                    # Vercel デプロイ設定
├── package.json
├── .env.local                     # ローカル環境変数
├── .env.production                # 本番環境変数（Vercel 上で設定）
└── .gitignore

ホスティング: https://your-domain.vercel.app
無料枠: 帯域幅 100GB/月、ビルド 3,000 時間/月
自動デプロイ: Git push → GitHub Actions → Vercel
```

### バックエンド（Cloudflare Workers）

```
プロジェクト構成:
backend/
├── src/
│   ├── index.ts                   # メインエントリーポイント
│   ├── middleware/
│   │   └── auth.ts                # API パスワード認証
│   ├── services/
│   │   ├── connpass.ts            # Connpass スクレイピング
│   │   ├── storage.ts             # KV + Google Sheets 保存
│   │   └── audit.ts               # ログ記録
│   ├── utils/
│   │   ├── parser.ts              # HTML パース（正規表現）
│   │   ├── cache.ts               # KV キャッシング
│   │   └── errors.ts              # エラーハンドリング
│   └── admin.ts                   # 管理画面エンドポイント
├── wrangler.toml                  # Wrangler 設定（KV Namespace）
├── wrangler.local.toml            # ローカル開発設定
├── package.json
├── tsconfig.json
├── .env.local                     # ローカル環境変数
├── .env.production                # 本番環境変数
└── .gitignore

ホスティング: https://api.your-domain.workers.dev
無料枠: 100,000 リクエスト/日、CPU 50ms/リクエスト、メモリ 128MB
自動デプロイ: Git push → GitHub Actions → wrangler publish
```

---

## コンポーネントと インターフェース

### 1. Authentication Middleware

**責務**: 全リクエストの API パスワード検証と有効期限チェック

**実装例（TypeScript）**:

```typescript
// src/middleware/auth.ts
export async function handleAuth(request: Request, env: Env): Promise<Response | null> {
  // Authorization ヘッダ抽出
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({
      success: false,
      error: 'INVALID_PASSWORD',
      message: 'Missing Authorization header'
    }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  // Bearer トークン抽出
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return new Response(JSON.stringify({
      success: false,
      error: 'INVALID_PASSWORD',
      message: 'Invalid Authorization format'
    }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  // API パスワード検証
  const apiPassword = env.API_PASSWORD;
  if (token !== apiPassword) {
    return new Response(JSON.stringify({
      success: false,
      error: 'INVALID_PASSWORD',
      message: 'Invalid API password'
    }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  // 有効期限チェック
  const expiryDate = new Date(env.API_PASSWORD_EXPIRY);
  const now = new Date();
  if (now > expiryDate) {
    return new Response(JSON.stringify({
      success: false,
      error: 'PASSWORD_EXPIRED',
      message: 'API password has expired'
    }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  return null; // 認証成功
}
```

**環境変数**:

```toml
# wrangler.toml
[env.production]
vars = {
  API_PASSWORD = "your_secure_password_here",
  API_PASSWORD_EXPIRY = "2024-12-31T23:59:59Z"
}
```

---

### 2. Registration Service

**責務**: QRコード照合と参加者検証

**処理フロー**:

```typescript
// src/services/connpass.ts
export async function verifyParticipant(
  qrCodeData: string,
  eventUrl: string,
  kv: KVNamespace
): Promise<VerificationResult> {
  // 1. 形式検証
  if (!isValidEventUrl(eventUrl)) {
    return { success: false, error: 'INVALID_QR_FORMAT' };
  }

  // 2. KV キャッシュ確認（TTL: 5-10 分）
  const cacheKey = `connpass:participants:${extractEventId(eventUrl)}`;
  let participants = await kv.get(cacheKey, 'json');

  // 3. キャッシュミスの場合、スクレイピング実行
  if (!participants) {
    try {
      const html = await fetch(eventUrl).then(r => r.text());
      participants = parseParticipants(html); // Cheerio/正規表現でパース
      
      // KV に 5-10 分 TTL で保存
      await kv.put(cacheKey, JSON.stringify(participants), { expirationTtl: 600 });
    } catch (error) {
      return { success: false, error: 'SCRAPING_FAILED' };
    }
  }

  // 4. 参加者照合
  const found = participants.some(p => p.username === qrCodeData);
  if (!found) {
    return { success: false, error: 'PARTICIPANT_NOT_FOUND' };
  }

  // 5. 登録記録を KV に保存
  const recordKey = `registration:${Date.now()}:${qrCodeData}`;
  await kv.put(recordKey, JSON.stringify({
    qrCodeData,
    eventUrl,
    status: 'SUCCESS',
    timestamp: new Date().toISOString(),
    ipAddress: extractClientIp(request)
  }));

  return { success: true };
}
```

**HTML パース（Cheerio 使用）**:

```typescript
import cheerio from 'cheerio';

function parseParticipants(html: string): Participant[] {
  const $ = cheerio.load(html);
  const participants: Participant[] = [];

  // Connpass の参加者テーブル構造に合わせてセレクタ調整
  $('table tbody tr').each((i, elem) => {
    const username = $(elem).find('td:first-child').text().trim();
    if (username) {
      participants.push({ username });
    }
  });

  return participants;
}
```

**または正規表現による高速パース**:

```typescript
function parseParticipantsRegex(html: string): Participant[] {
  // Connpass HTML 構造の正規表現パターン
  const regex = /<tr.*?><td[^>]*>([a-zA-Z0-9_\-\.]+)<\/td>/g;
  const participants: Participant[] = [];
  let match;

  while ((match = regex.exec(html)) !== null) {
    participants.push({ username: match[1] });
  }

  return participants;
}
```

---

### 3. KV Store スキーマ

**KV Namespace 定義**:

```toml
# wrangler.toml
[[kv_namespaces]]
binding = "CONNPASS_SESSION"
id = "xxxxxxxxxxxxxxxx"  # wrangler kv:namespace create "CONNPASS_SESSION" で生成

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

**データ構造**:

```typescript
// Connpass Session
Key: "connpass:session:main"
Value: {
  email: "connpass@example.com",
  lastLoginAt: "2024-01-15T08:00:00Z",
  expiresAt: "2024-01-16T08:00:00Z",
  sessionId: "unique_session_id",
  isValid: true,
  loginCount: 1
}

// 参加者リスト キャッシュ
Key: "connpass:participants:12345"  // eventId = 12345
Value: [
  { username: "user_001" },
  { username: "user_002" },
  ...
]
TTL: 300-600 秒

// 登録記録
Key: "registration:1705317045000:user_001"  // timestamp:qrCodeData
Value: {
  qrCodeData: "user_001",
  eventUrl: "https://www.connpass.com/event/xxxxx/",
  status: "SUCCESS",
  timestamp: "2024-01-15T10:30:45Z",
  ipAddress: "192.168.1.100"
}

// 監査ログ
Key: "audit:2024-01-15"
Value: [
  {
    timestamp: "2024-01-15T10:30:45Z",
    method: "POST",
    path: "/api/registration/register",
    statusCode: 200,
    qrCodeData: "user_001",
    error: null
  },
  ...
]
```

---

### 4. Registration API エンドポイント

**エンドポイント**: `POST /api/registration/register`

**実装例**:

```typescript
// src/index.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS 対応
    const headers = {
      'Access-Control-Allow-Origin': env.FRONTEND_URL,
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    };

    // Preflight リクエスト処理
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    try {
      const url = new URL(request.url);

      if (url.pathname === '/api/registration/register' && request.method === 'POST') {
        // 認証ミドルウェア実行
        const authError = await handleAuth(request, env);
        if (authError) return authError;

        // リクエストボディ解析
        const body = await request.json();
        const { qrCodeData, eventUrl } = body;

        if (!qrCodeData || !eventUrl) {
          return new Response(JSON.stringify({
            success: false,
            error: 'INVALID_QR_FORMAT',
            message: 'Missing required fields'
          }), { status: 400, headers });
        }

        // 参加者検証実行
        const result = await verifyParticipant(qrCodeData, eventUrl, env.PARTICIPANTS_CACHE);

        if (!result.success) {
          // エラーレスポンス
          const statusCode = result.error === 'SCRAPING_FAILED' ? 500 : 400;
          return new Response(JSON.stringify({
            success: false,
            error: result.error,
            message: getErrorMessage(result.error)
          }), { status: statusCode, headers });
        }

        // 成功レスポンス
        return new Response(JSON.stringify({
          success: true,
          message: 'Registration successful',
          participant: {
            username: qrCodeData,
            eventUrl,
            registeredAt: new Date().toISOString()
          }
        }), { status: 200, headers });
      }

      if (url.pathname === '/api/health' && request.method === 'GET') {
        return new Response(JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString()
        }), { status: 200, headers });
      }

      return new Response(JSON.stringify({
        success: false,
        error: 'NOT_FOUND'
      }), { status: 404, headers });
    } catch (error) {
      console.error('Unhandled error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
      }), { status: 500, headers });
    }
  }
};
```

---

### 5. フロントエンド（Vue.js）

**QRScanner コンポーネント**:

```typescript
// src/components/QRScanner.vue
<template>
  <div class="qr-scanner">
    <video ref="videoElement" autoplay playsinline></video>
    <canvas ref="canvasElement" style="display: none"></canvas>
    
    <div v-if="result" class="result" :class="result.type">
      <p>{{ result.message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import jsQR from 'jsqr';

const videoElement = ref<HTMLVideoElement>();
const canvasElement = ref<HTMLCanvasElement>();
const result = ref<{ type: string; message: string } | null>(null);
const animationId = ref<number | null>(null);

const API_PASSWORD = import.meta.env.VITE_API_PASSWORD;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const EVENT_URL = import.meta.env.VITE_EVENT_URL;

onMounted(async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    
    if (videoElement.value) {
      videoElement.value.srcObject = stream;
      startScanning();
    }
  } catch (error) {
    result.value = {
      type: 'error',
      message: 'カメラにアクセスできません。ブラウザの設定を確認してください。'
    };
  }
});

function startScanning() {
  if (!videoElement.value || !canvasElement.value) return;

  const video = videoElement.value;
  const canvas = canvasElement.value;
  const ctx = canvas.getContext('2d');

  function scan() {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);

      if (imageData) {
        const code = jsQR(imageData.data, canvas.width, canvas.height);
        
        if (code) {
          handleQRDetected(code.data);
          return;
        }
      }
    }

    animationId.value = requestAnimationFrame(scan);
  }

  scan();
}

async function handleQRDetected(qrData: string) {
  try {
    result.value = {
      type: 'loading',
      message: '登録処理中...'
    };

    const response = await fetch(`${API_BASE_URL}/api/registration/register`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_PASSWORD}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        qrCodeData: qrData,
        eventUrl: EVENT_URL
      })
    });

    const data = await response.json();

    if (response.ok) {
      result.value = {
        type: 'success',
        message: `✓ ${qrData} 登録完了`
      };
      
      // 3 秒後にリセット
      setTimeout(() => {
        result.value = null;
      }, 3000);
    } else {
      result.value = {
        type: 'error',
        message: `✗ ${data.message || '登録に失敗しました'}`
      };
    }
  } catch (error) {
    result.value = {
      type: 'error',
      message: '通信エラーが発生しました。'
    };
  }
}

onUnmounted(() => {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value);
  }

  const stream = videoElement.value?.srcObject as MediaStream;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
});
</script>

<style scoped>
.qr-scanner {
  position: relative;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

video {
  width: 100%;
  height: auto;
  border: 2px solid #ccc;
}

.result {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 5px;
  color: white;
  font-weight: bold;
}

.result.success {
  background-color: #28a745;
}

.result.error {
  background-color: #dc3545;
}

.result.loading {
  background-color: #007bff;
}
</style>
```

---

## Google Sheets への非同期保存

**実装方針**:

1. **Workers で登録を即座に返す**
   - 登録成功/失敗は KV に記録
   - クライアントに即座にレスポンス返却

2. **非同期で Google Sheets に保存**
   - Cloudflare Durable Objects または Queue を使用
   - または、手動で cron トリガーを設定

**簡易実装例**:

```typescript
// src/services/storage.ts
export async function saveToGoogleSheets(
  record: RegistrationRecord,
  env: Env
): Promise<void> {
  const SHEET_ID = env.GOOGLE_SHEET_ID;
  const API_KEY = env.GOOGLE_SHEETS_API_KEY;

  const values = [[
    record.timestamp,
    record.qrCodeData,
    record.eventUrl,
    record.status,
    record.ipAddress
  ]];

  try {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1!A:E:append?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          values,
          majorDimension: 'ROWS'
        })
      }
    );
  } catch (error) {
    console.error('Failed to save to Google Sheets:', error);
    // エラーは KV に記録（後で手動でリトライ）
  }
}
```

---

## 環境変数設定

**Vercel（.env.production）**:

```bash
VITE_API_PASSWORD=your_secure_password_here
VITE_API_BASE_URL=https://api.your-domain.workers.dev
VITE_EVENT_URL=https://www.connpass.com/event/xxxxx/
```

**Cloudflare Workers（wrangler.toml）**:

```toml
name = "event-qrcode-reception"
main = "src/index.ts"
compatibility_date = "2024-01-15"

[env.production]
vars = {
  API_PASSWORD = "your_secure_password_here",
  API_PASSWORD_EXPIRY = "2024-12-31T23:59:59Z",
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

## デプロイメント手順

### フロントエンド（Vercel）

```bash
# 1. Vercel CLI インストール
npm install -g vercel

# 2. Vercel にログイン
vercel login

# 3. プロジェクトリンク
cd frontend
vercel link

# 4. 環境変数設定
vercel env add VITE_API_PASSWORD
vercel env add VITE_API_BASE_URL

# 5. デプロイ
vercel deploy --prod

# または Git 連携（推奨）
# GitHub に push → 自動デプロイ
```

### バックエンド（Cloudflare Workers）

```bash
# 1. Wrangler CLI インストール
npm install -g @cloudflare/wrangler

# 2. Cloudflare にログイン
wrangler login

# 3. KV Namespace 作成
wrangler kv:namespace create "CONNPASS_SESSION"
wrangler kv:namespace create "PARTICIPANTS_CACHE"
wrangler kv:namespace create "REGISTRATION_RECORDS"
wrangler kv:namespace create "AUDIT_LOGS"

# 4. 環境変数設定（wrangler.toml に上記 ID を設定）

# 5. ローカルテスト
wrangler dev

# 6. デプロイ
wrangler publish --env production

# または GitHub Actions で自動デプロイ
```

---

## エラーハンドリング

### エラーコード対応表

| エラーコード | HTTP ステータス | 説明 | ユーザーメッセージ |
|---|---|---|---|
| `INVALID_PASSWORD` | 401 | API パスワード不正 | 認証に失敗しました。パスワードを確認してください。 |
| `PASSWORD_EXPIRED` | 401 | パスワード有効期限切れ | API パスワードの有効期限が切れています。管理者に連絡してください。 |
| `INVALID_QR_FORMAT` | 400 | QRコード形式無効 | QRコードの形式が無効です。 |
| `PARTICIPANT_NOT_FOUND` | 400 | 参加者未検出 | このユーザーはイベント参加者一覧に見つかりません。 |
| `ALREADY_REGISTERED` | 400 | 二重登録 | このユーザーは既に登録済みです。 |
| `SCRAPING_FAILED` | 500 | スクレイピング失敗 | イベント情報の取得に失敗しました。管理者に報告してください。 |
| `NETWORK_ERROR` | 500 | ネットワーク接続エラー | インターネット接続を確認してください。 |
| `INTERNAL_SERVER_ERROR` | 500 | 予期しないエラー | 予期しないエラーが発生しました。システム管理者に連絡してください。 |

---

## パフォーマンス最適化

### Cloudflare Workers の制約への対応

| 制約 | 対応策 |
|---|---|
| **リクエストタイムアウト: 30 秒** | 非同期処理で Google Sheets 保存を Workers 内で完結させない。KV のみで返す。 |
| **CPU 時間: 50ms/リクエスト** | 正規表現による高速パース。Puppeteer ではなく fetch + Cheerio 使用。 |
| **メモリ: 128MB** | 大規模な HTML は分割パース。キャッシュ戦略で重複アクセス削減。 |
| **リクエスト数: 100,000/日** | キャッシング（TTL: 5-10 分）でスクレイピング回数削減 |
| **KV 読み込み: 100,000/日** | 適切なキャッシング戦略で削減 |

### レスポンス時間目標

| 処理 | 目標 | 最適化方法 |
|---|---|---|
| API パスワード検証 | < 10ms | 環境変数参照のみ |
| キャッシュヒット時の登録 | < 200ms | メモリキャッシュ活用 |
| キャッシュミス時の登録 | < 3 秒 | 並列 fetch、正規表現パース |

---

## テスト戦略

### ユニットテスト

```bash
# Frontend テスト（Vitest + Vue Test Utils）
cd frontend
npm run test

# Backend テスト（Jest）
cd backend
npm run test
```

### 統合テスト

```bash
# ローカル環境での統合テスト
# Frontend: npm run dev (http://localhost:5173)
# Backend: wrangler dev (http://localhost:8787)

# API 直接テスト
curl -X POST http://localhost:8787/api/registration/register \
  -H "Authorization: Bearer test_password" \
  -H "Content-Type: application/json" \
  -d '{
    "qrCodeData": "user_001",
    "eventUrl": "https://www.connpass.com/event/xxxxx/"
  }'
```

---

## 料金・無料枠の確認

| サービス | 無料枠 | 備考 |
|---|---|---|
| **Vercel** | 帯域幅 100GB/月 | ビルド 3,000 時間/月 |
| **Cloudflare Workers** | 100,000 リクエスト/日 | CPU 50ms/リクエスト |
| **Cloudflare KV** | 100k 読込/日、10k 書込/日 | 十分なキャッシング戦略で対応 |
| **Google Sheets API** | 無制限（標準制限内） | 1 秒あたり 60 リクエスト |

**合計月額コスト: ¥0** ✅

---

## セキュリティ考慮事項

### API パスワード保護

```typescript
// wrangler.toml の Secrets（アップロード時に暗号化）
[env.production]
vars = {
  API_PASSWORD = "use_wrangler_secret instead"
}

// 実際の設定
wrangler secret put API_PASSWORD --env production
```

### CORS 設定

```typescript
const headers = {
  'Access-Control-Allow-Origin': env.FRONTEND_URL,  // 特定ドメインのみ許可
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};
```

### ログ機密情報除外

```typescript
// パスワード、個人情報をログに含めない
async function logToAuditTrail(request: Request, response: Response) {
  const record = {
    timestamp: new Date().toISOString(),
    method: request.method,
    path: new URL(request.url).pathname,
    statusCode: response.status
    // password フィールドは除外
  };

  await AUDIT_LOGS.put(`audit:${Date.now()}`, JSON.stringify(record));
}
```

---

## 管理画面（オプション）

### Cloudflare Workers 内実装

```typescript
// src/admin.ts
export async function handleAdmin(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === '/admin' && request.method === 'GET') {
    // 管理画面 HTML 返却
    return new Response(getAdminHtml(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  if (url.pathname === '/admin/logs' && request.method === 'GET') {
    // 登録ログ取得
    const keys = await AUDIT_LOGS.list();
    const logs = [];

    for (const key of keys.keys) {
      const log = await AUDIT_LOGS.get(key.name, 'json');
      logs.push(log);
    }

    return new Response(JSON.stringify(logs), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response('Not Found', { status: 404 });
}

function getAdminHtml(): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Admin Dashboard</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body>
      <h1>イベント受付システム管理画面</h1>
      <div id="logs"></div>
      <script>
        fetch('/admin/logs')
          .then(r => r.json())
          .then(logs => {
            document.getElementById('logs').innerHTML = logs
              .map(log => \`<p>\${JSON.stringify(log)}</p>\`)
              .join('');
          });
      </script>
    </body>
    </html>
  `;
}
```

---

## トラブルシューティング

### スクレイピング失敗

**原因**: Connpass ページ構造が変更された可能性

**対応**:
1. Connpass ページのソースコードを確認
2. CSS セレクタまたは正規表現パターンを更新
3. Workers を再デプロイ

```bash
wrangler publish --env production
```

### KV キャッシュミス率が高い

**原因**: TTL が短すぎるか、イベント数が多い

**対応**:
1. TTL を 10-15 分に延長
2. 有料プランにアップグレード
3. キャッシングロジックの見直し

### Google Sheets API レート制限

**原因**: 1 秒あたり 60 リクエスト制限に達した

**対応**:
1. バッチ API を使用
2. キュー機構でリクエストを遅延実行
3. 有料サービスアカウント使用

---

## 今後の拡張可能性

1. **複数イベント同時対応**: 異なるイベント URL の切り替え
2. **複数言語対応**: 日本語以外のメッセージ
3. **統計ダッシュボード**: リアルタイム登録状況の表示
4. **QRコード生成**: 参加者用 QRコード生成機能
5. **モバイルアプリ化**: React Native / Flutter での実装
6. **D1 Database 統合**: 高度なクエリが必要な場合

---

## まとめ

本システムは、**Vercel** と **Cloudflare Workers** の無料枠を活用した完全無料の QRコード受付システムです。

**主な特徴**:
- ✅ 完全無料（月額 ¥0）
- ✅ スケーラブル（Cloudflare Workers）
- ✅ 自動デプロイ（Vercel + GitHub Actions）
- ✅ 低遅延（エッジコンピューティング）
- ✅ セキュア（API パスワード + CORS）

**推奨デプロイ環境**:
- フロントエンド: Vercel（https://your-domain.vercel.app）
- バックエンド: Cloudflare Workers（https://api.your-domain.workers.dev）
- ストレージ: Cloudflare KV + Google Sheets API
