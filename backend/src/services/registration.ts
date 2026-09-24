import { Env } from '../types';
import { RegistrationRecord } from '../types';
import { verifyParticipant } from './connpass';
import { ErrorResponse, ErrorCode, ERROR_MESSAGES } from '../errors';

/**
 * 参加登録サービス
 * QRコードデータと参加者一覧を照合、登録レコード作成
 */

/**
 * 二重登録チェック
 */
export async function checkDuplicateRegistration(
  kv: Env['REGISTRATION_RECORDS'],
  qrCodeData: string,
  eventUrl: string
): Promise<boolean> {
  // 現在時刻（分単位のキー）
  const now = new Date();
  const minuteKey = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM

  // 検索キーのプレフィックス
  const searchKey = `registration:${minuteKey}:${qrCodeData}`;

  // KV からキーを検索（プレフィックス検索は未サポートのため、全キーをリスト）
  const keys = await kv.list();
  
  for (const key of keys.keys) {
    if (key.name.includes(searchKey)) {
      return true; // 既に登録済み
    }
  }

  return false; // 未登録
}

/**
 * 登録レコードを作成
 */
export async function createRegistrationRecord(
  kv: Env['REGISTRATION_RECORDS'],
  qrCodeData: string,
  eventUrl: string,
  ipAddress?: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  const recordKey = `registration:${timestamp}:${qrCodeData}`;

  const record: RegistrationRecord = {
    qrCodeData,
    eventUrl,
    status: 'SUCCESS',
    timestamp,
    ipAddress,
  };

  await kv.put(recordKey, JSON.stringify(record));
}

/**
 * 参加者を登録
 */
export async function registerParticipant(
  qrCodeData: string,
  eventUrl: string,
  env: Env,
  fetchFn: typeof fetch = fetch
): Promise<{ success: boolean; error?: ErrorCode; message?: string }> {
  // 1. 形式検証
  if (!qrCodeData || !eventUrl) {
    return {
      success: false,
      error: ErrorCode.INVALID_QR_FORMAT,
      message: ERROR_MESSAGES[ErrorCode.INVALID_QR_FORMAT],
    };
  }

  // 2. 二重登録チェック
  const isDuplicate = await checkDuplicateRegistration(
    env.REGISTRATION_RECORDS,
    qrCodeData,
    eventUrl
  );

  if (isDuplicate) {
    return {
      success: false,
      error: ErrorCode.ALREADY_REGISTERED,
      message: ERROR_MESSAGES[ErrorCode.ALREADY_REGISTERED],
    };
  }

  // 3. 参加者検証
  const result = await verifyParticipant(
    qrCodeData,
    eventUrl,
    env.PARTICIPANTS_CACHE,
    fetchFn
  );

  if (!result.found) {
    return {
      success: false,
      error: ErrorCode.PARTICIPANT_NOT_FOUND,
      message: ERROR_MESSAGES[ErrorCode.PARTICIPANT_NOT_FOUND],
    };
  }

  // 4. 登録レコード作成
  await createRegistrationRecord(
    env.REGISTRATION_RECORDS,
    qrCodeData,
    eventUrl,
    undefined // IP アドレスは後で追加可能
  );

  // 5. Google Sheets に非同期保存（ブロッキングしない）
  saveToGoogleSheets(qrCodeData, eventUrl, env).catch((err) => {
    console.error('Failed to save to Google Sheets:', err);
  });

  return { success: true };
}

/**
 * Google Sheets への非同期保存（エラーハンドリング付き）
 */
async function saveToGoogleSheets(
  qrCodeData: string,
  eventUrl: string,
  env: Env
): Promise<void> {
  const SHEET_ID = env.GOOGLE_SHEET_ID;
  const API_KEY = env.GOOGLE_SHEETS_API_KEY;

  if (!SHEET_ID || !API_KEY) {
    console.warn('Google Sheets credentials not configured');
    return;
  }

  const values = [[
    new Date().toISOString(),
    qrCodeData,
    eventUrl,
    'SUCCESS',
  ]];

  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1!A:D:append?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          values,
          majorDimension: 'ROWS',
        }),
      }
    );

    if (!response.ok) {
      console.error('Google Sheets API error:', await response.text());
    }
  } catch (error) {
    console.error('Failed to save to Google Sheets:', error);
  }
}
