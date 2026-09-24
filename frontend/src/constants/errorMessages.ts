/**
 * エラーメッセージ定義
 */

export interface ErrorInfo {
  code: string;
  message: string;
  action?: string;
}

export const ERROR_MESSAGES: Record<string, ErrorInfo> = {
  INVALID_PASSWORD: {
    code: 'INVALID_PASSWORD',
    message: '認証に失敗しました。パスワードを確認してください。',
    action: 'API パスワードを再確認してください。',
  },
  PASSWORD_EXPIRED: {
    code: 'PASSWORD_EXPIRED',
    message: 'API パスワードの有効期限が切れています。管理者に連絡してください。',
    action: '管理者に連絡して API パスワードを更新してください。',
  },
  INVALID_QR_FORMAT: {
    code: 'INVALID_QR_FORMAT',
    message: 'QRコードの形式が無効です。',
    action: '正しい QRコードをスキャンしてください。',
  },
  PARTICIPANT_NOT_FOUND: {
    code: 'PARTICIPANT_NOT_FOUND',
    message: 'このユーザーはイベント参加者一覧に見つかりません。',
    action: 'Connpass に正しく登録されているか確認してください。',
  },
  ALREADY_REGISTERED: {
    code: 'ALREADY_REGISTERED',
    message: 'このユーザーは既に登録済みです。',
    action: '重複登録を防ぐため、同一ユーザーの再スキャンはできません。',
  },
  SCRAPING_FAILED: {
    code: 'SCRAPING_FAILED',
    message: 'イベント情報の取得に失敗しました。管理者に報告してください。',
    action: 'ネットワーク接続を確認し、再試行してください。',
  },
  SESSION_EXPIRED: {
    code: 'SESSION_EXPIRED',
    message: 'セッションが期限切れになっています。ページをリロードしてください。',
    action: 'ブラウザをリロードして再度お試しください。',
  },
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: 'インターネット接続を確認してください。',
    action: 'ネットワーク接続を確認してください。',
  },
  INTERNAL_SERVER_ERROR: {
    code: 'INTERNAL_SERVER_ERROR',
    message: '予期しないエラーが発生しました。システム管理者に連絡してください。',
    action: '管理者に連絡してください。',
  },
};

/**
 * エラーコードから日本語メッセージを取得
 */
export function getErrorMessage(errorCode: string): string {
  return ERROR_MESSAGES[errorCode]?.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR.message;
}

/**
 * エラーコードから推奨アクションを取得
 */
export function getErrorAction(errorCode: string): string | undefined {
  return ERROR_MESSAGES[errorCode]?.action;
}
