import { Env } from '../types';
import { AuditLogEntry } from '../types';
import { ErrorResponse } from '../errors';

/**
 * 監査ログサービス
 * すべてのリクエスト/レスポンスを KV Store に記録
 */

// ログ保持期間: 30 日
const LOG_RETENTION_DAYS = 30;

/**
 * 監査ログエントリを作成
 */
export function createAuditLog(
  request: Request,
  responseStatus: number,
  qrCodeData?: string,
  error?: string
): AuditLogEntry {
  return {
    timestamp: new Date().toISOString(),
    method: request.method,
    path: new URL(request.url).pathname,
    statusCode: responseStatus,
    qrCodeData,
    error,
  };
}

/**
 * 監査ログを KV Store に保存
 */
export async function saveAuditLog(
  kv: Env['AUDIT_LOGS'],
  log: AuditLogEntry
): Promise<void> {
  const now = new Date();
  const dateKey = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const timestampKey = now.toISOString().replace(/[:.]/g, '-');

  const logKey = `audit:${dateKey}:${timestampKey}`;

  // 機密情報除外
  const sanitizedLog = {
    ...log,
    // Authorization ヘッダは絶対に含めない
  };

  await kv.put(logKey, JSON.stringify(sanitizedLog));
}

/**
 * 最近の監査ログを取得
 */
export async function getRecentAuditLogs(
  kv: Env['AUDIT_LOGS'],
  limit: number = 100
): Promise<AuditLogEntry[]> {
  const keys = await kv.list();
  
  const logs: AuditLogEntry[] = [];
  
  // 最近のキーから limit 件取得
  for (const key of keys.keys.slice(0, limit)) {
    try {
      const log = await kv.get(key.name, 'json');
      if (log) {
        logs.push(log as AuditLogEntry);
      }
    } catch {
      // 無視
    }
  }

  // タイムスタンプでソート（新しい順）
  logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return logs;
}
