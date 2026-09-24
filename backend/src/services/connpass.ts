import { Env } from '../types';
import { generateCacheKey, extractEventId, getCachedParticipants, cacheParticipants } from './cache';

/**
 * 参加者検証サービス
 * QRコードデータを Connpass 参加者一覧と照合
 */

// Connpass ユーザー名パターン
const USERNAME_PATTERN = /^[a-zA-Z0-9_\-\.]+$/;

/**
 * Connpass イベント URL が有効か検証
 */
export function isValidEventUrl(eventUrl: string): boolean {
  try {
    new URL(eventUrl);
    return eventUrl.includes('connpass.com');
  } catch {
    return false;
  }
}

/**
 * 参加者名が有効か検証
 */
export function isValidParticipantName(name: string): boolean {
  return USERNAME_PATTERN.test(name.trim());
}

/**
 * 参加者一覧をパース（正規表現フォールバック）
 */
export function parseParticipants(html: string): string[] {
  // Connpass の参加者リンクパターン
  // <a href="/user/username">username</a>
  const userLinkRegex = /<a href="\/user\/([^"]+)"[^>]*>([^<]+)<\/a>/g;
  const participants = new Set<string>();

  let match;
  while ((match = userLinkRegex.exec(html)) !== null) {
    const username = match[2].trim();
    if (isValidParticipantName(username)) {
      participants.add(username);
    }
  }

  return Array.from(participants);
}

/**
 * 参加者を検証
 * - キャッシュから取得 or Connpass からスクレイピング
 * - QRコードデータと照合
 */
export async function verifyParticipant(
  qrCodeData: string,
  eventUrl: string,
  kv: Env['PARTICIPANTS_CACHE'],
  fetchFn: typeof fetch = fetch
): Promise<{ found: boolean; participants?: string[] }> {
  // 1. 形式検証
  if (!isValidEventUrl(eventUrl)) {
    return { found: false };
  }

  // 2. キャッシュから取得
  let participants = await getCachedParticipants(kv, eventUrl);

  // 3. キャッシュミスの場合、スクレイピング実行
  if (!participants) {
    try {
      const response = await fetchFn(eventUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      participants = parseParticipants(html);
      
      // KV にキャッシュ
      await cacheParticipants(kv, eventUrl, participants);
    } catch (error) {
      console.error('Failed to fetch participants:', error);
      return { found: false };
    }
  }

  // 4. 参加者照合
  const found = participants.some(
    (p) => p.toLowerCase() === qrCodeData.toLowerCase()
  );

  return { found, participants };
}
