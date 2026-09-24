import { handleAuth } from '../middleware/auth';
import { registerParticipant } from '../services/registration';
import { createAuditLog, saveAuditLog } from '../services/audit';
import { Env } from '../types';
import { ErrorResponse, SuccessResponse, ErrorCode } from '../errors';

/**
 * 登録リクエストボディ
 */
interface RegistrationRequest {
  qrCodeData: string;
  eventUrl: string;
}

/**
 * 登録レスポンス
 */
interface RegistrationResponse {
  success: boolean;
  participant?: {
    username: string;
    eventUrl: string;
    registeredAt: string;
  };
  error?: ErrorCode;
  message?: string;
}

/**
 * POST /api/registration/register エンドポイントハンドラー
 */
export async function handleRegistration(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // 認証ミドルウェア実行
    const authError = await handleAuth(request, env);
    if (authError) {
      return createJsonResponse(authError, 401);
    }

    // リクエストボディ解析
    const body: RegistrationRequest = await request.json();
    const { qrCodeData, eventUrl } = body;

    if (!qrCodeData || !eventUrl) {
      const error: ErrorResponse = {
        success: false,
        error: ErrorCode.INVALID_QR_FORMAT,
        message: 'Missing required fields: qrCodeData and eventUrl',
      };
      return createJsonResponse(error, 400);
    }

    // 参加者登録実行
    const result = await registerParticipant(qrCodeData, eventUrl, env);

    // 監査ログ記録
    const auditLog = createAuditLog(
      request,
      result.success ? 200 : 400,
      qrCodeData,
      result.error
    );
    await saveAuditLog(env.AUDIT_LOGS, auditLog);

    if (result.success) {
      const response: SuccessResponse<RegistrationResponse> = {
        success: true,
        message: 'Registration successful',
        data: {
          success: true,
          participant: {
            username: qrCodeData,
            eventUrl,
            registeredAt: new Date().toISOString(),
          },
        },
      };
      return createJsonResponse(response, 200);
    } else {
      const error: ErrorResponse = {
        success: false,
        error: result.error || ErrorCode.INTERNAL_SERVER_ERROR,
        message: result.message,
      };
      return createJsonResponse(error, 400);
    }
  } catch (error) {
    console.error('Unhandled error:', error);

    // グローバルエラーハンドリング
    const auditLog = createAuditLog(request, 500);
    await saveAuditLog(env.AUDIT_LOGS, auditLog);

    const errorResponse: ErrorResponse = {
      success: false,
      error: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
    };
    return createJsonResponse(errorResponse, 500);
  }
}

/**
 * JSON レスポンスを作成
 */
function createJsonResponse<T>(data: T, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
