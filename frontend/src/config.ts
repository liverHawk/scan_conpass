/**
 * 設定管理
 * 環境変数の読み込みと設定管理
 */

interface AppConfig {
  apiKey: string;
  baseUrl: string;
  eventUrl: string;
}

/**
 * 環境変数から設定を読み込み
 */
export function loadConfig(): AppConfig {
  const importMetaEnv = import.meta.env;
  
  const apiKey = importMetaEnv.VITE_API_PASSWORD;
  const baseUrl = importMetaEnv.VITE_API_BASE_URL;
  const eventUrl = importMetaEnv.VITE_EVENT_URL;

  // 必須環境変数のチェック
  const missing: string[] = [];
  
  if (!apiKey) missing.push('VITE_API_PASSWORD');
  if (!baseUrl) missing.push('VITE_API_BASE_URL');
  if (!eventUrl) missing.push('VITE_EVENT_URL');

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check .env.local file.'
    );
  }

  return {
    apiKey,
    baseUrl,
    eventUrl,
  };
}

/**
 * デバッグモードかどうか
 */
export function isDevMode(): boolean {
  return import.meta.env.DEV;
}

/**
 * 開発環境のデフォルト設定
 */
export const devDefaults = {
  baseUrl: 'http://localhost:8787',
  eventUrl: 'https://www.connpass.com/event/xxxxx/',
};
