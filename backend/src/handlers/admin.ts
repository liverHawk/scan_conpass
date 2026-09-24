import { createAuditLog, saveAuditLog, getRecentAuditLogs } from '../services/audit';
import { Env } from '../types';
import { SuccessResponse } from '../errors';

/**
 * GET /api/health エンドポイントハンドラー
 */
export async function handleHealthCheck(
  request: Request,
  env: Env
): Promise<Response> {
  // 監査ログ記録
  const auditLog = createAuditLog(request, 200);
  await saveAuditLog(env.AUDIT_LOGS, auditLog);

  const response: SuccessResponse<{
    status: string;
    timestamp: string;
    uptime: number;
  }> = {
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime?.() || 0,
    },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /admin/logs エンドポイントハンドラー
 */
export async function handleAdminLogs(
  request: Request,
  env: Env
): Promise<Response> {
  // 監査ログ記録
  const auditLog = createAuditLog(request, 200);
  await saveAuditLog(env.AUDIT_LOGS, auditLog);

  // クエリパラメータから limit を取得
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '100', 10);

  // 監査ログ取得
  const logs = await getRecentAuditLogs(env.AUDIT_LOGS, limit);

  const response: SuccessResponse<{ logs: typeof logs }> = {
    success: true,
    data: { logs },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
