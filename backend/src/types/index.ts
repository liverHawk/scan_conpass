/**
 * TypeScript 型定義
 */

// QRコード検証結果
export interface VerificationResult {
  success: boolean;
  error?: string;
  message?: string;
  participant?: Participant;
}

// 参加者情報
export interface Participant {
  username: string;
  registeredAt?: string;
}

// 登録レコード
export interface RegistrationRecord {
  qrCodeData: string;
  eventUrl: string;
  status: 'SUCCESS' | 'FAILED';
  timestamp: string;
  ipAddress?: string;
}

// 監査ログエントリ
export interface AuditLogEntry {
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  qrCodeData?: string;
  error?: string;
}

// リクエストボディ
export interface RegistrationRequest {
  qrCodeData: string;
  eventUrl: string;
}

// レスポンス形式
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Cloudflare Workers 環境変数
export interface Env {
  API_PASSWORD: string;
  API_PASSWORD_EXPIRY: string;
  FRONTEND_URL: string;
  CONNPASS_SESSION: KVNamespace;
  PARTICIPANTS_CACHE: KVNamespace;
  REGISTRATION_RECORDS: KVNamespace;
  AUDIT_LOGS: KVNamespace;
  GOOGLE_SHEET_ID?: string;
  GOOGLE_SHEETS_API_KEY?: string;
}
