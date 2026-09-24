/**
 * エラーコード定義
 */

// エラーコード
export enum ErrorCode {
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  PASSWORD_EXPIRED = 'PASSWORD_EXPIRED',
  INVALID_QR_FORMAT = 'INVALID_QR_FORMAT',
  PARTICIPANT_NOT_FOUND = 'PARTICIPANT_NOT_FOUND',
  ALREADY_REGISTERED = 'ALREADY_REGISTERED',
  SCRAPING_FAILED = 'SCRAPING_FAILED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

// エラーメッセージマップ
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.INVALID_PASSWORD]: '認証に失敗しました。パスワードを確認してください。',
  [ErrorCode.PASSWORD_EXPIRED]: 'API パスワードの有効期限が切れています。管理者に連絡してください。',
  [ErrorCode.INVALID_QR_FORMAT]: 'QRコードの形式が無効です。',
  [ErrorCode.PARTICIPANT_NOT_FOUND]: 'このユーザーはイベント参加者一覧に見つかりません。',
  [ErrorCode.ALREADY_REGISTERED]: 'このユーザーは既に登録済みです。',
  [ErrorCode.SCRAPING_FAILED]: 'イベント情報の取得に失敗しました。管理者に報告してください。',
  [ErrorCode.SESSION_EXPIRED]: 'セッションが期限切れになっています。システムを再起動してください。',
  [ErrorCode.NETWORK_ERROR]: 'インターネット接続を確認してください。',
  [ErrorCode.INTERNAL_SERVER_ERROR]: '予期しないエラーが発生しました。システム管理者に連絡してください。',
};

// エラーレスポンス型
export interface ErrorResponse {
  success: false;
  error: ErrorCode;
  message: string;
}

// 成功レスポンス型
export interface SuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

// すべてのレスポンス型
export type ResponseType<T = unknown> = ErrorResponse | SuccessResponse<T>;
