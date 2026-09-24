import { Env } from '../types';
import { ErrorResponse, ErrorCode, ERROR_MESSAGES } from '../errors';

/**
 * API パスワード認証ミドルウェア
 * Authorization ヘッダを検証し、API パスワードと有効期限をチェック
 */
export async function handleAuth(
  request: Request,
  env: Env
): Promise<ErrorResponse | null> {
  // Authorization ヘッダ抽出
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) {
    return createErrorResponse(ErrorCode.INVALID_PASSWORD, 'Missing Authorization header');
  }

  // Bearer トークン抽出
  const [scheme, token] = authHeader.split(' ');
  
  if (scheme !== 'Bearer' || !token) {
    return createErrorResponse(ErrorCode.INVALID_PASSWORD, 'Invalid Authorization format');
  }

  // API パスワード検証
  const apiPassword = env.API_PASSWORD;
  if (token !== apiPassword) {
    return createErrorResponse(ErrorCode.INVALID_PASSWORD, 'Invalid API password');
  }

  // 有効期限チェック
  const expiryDate = new Date(env.API_PASSWORD_EXPIRY);
  const now = new Date();
  
  if (now > expiryDate) {
    return createErrorResponse(ErrorCode.PASSWORD_EXPIRED, 'API password has expired');
  }

  return null; // 認証成功
}

/**
 * エラーレスポンスを作成
 */
function createErrorResponse(
  error: ErrorCode,
  message?: string
): ErrorResponse {
  return {
    success: false,
    error,
    message: message || ERROR_MESSAGES[error],
  };
}
