import { Env } from '../types';

/**
 * KV Store キャッシングサービス
 * 参加者リストを 5-10 分 TTL でキャッシュ
 */

// TTL: 5 分 (300 秒)
const CACHE_TTL = 300;

/**
 * キャッシュキーを生成
 */
export function generateCacheKey(eventId: string): string {
  return `connpass:participants:${eventId}`;
}

/**
 * イベント URL からイベント ID を抽出
 */
export function extractEventId(eventUrl: string): string | null {
  const match = eventUrl.match(/\/event\/(\d+)\//);
  return match ? match[1] : null;
}

/**
 * キャッシュから参加者リストを取得
 */
export async function getCachedParticipants(
  kv: KVNamespace,
  eventUrl: string
): Promise<string[] | null> {
  const eventId = extractEventId(eventUrl);
  if (!eventId) return null;

  const cacheKey = generateCacheKey(eventId);
  const cached = await kv.get(cacheKey, 'json');
  
  return cached as string[] | null;
}

/**
 * キャッシュに参加者リストを保存
 */
export async function cacheParticipants(
  kv: KVNamespace,
  eventUrl: string,
  participants: string[]
): Promise<void> {
  const eventId = extractEventId(eventUrl);
  if (!eventId) return;

  const cacheKey = generateCacheKey(eventId);
  await kv.put(cacheKey, JSON.stringify(participants), { expirationTtl: CACHE_TTL });
}
