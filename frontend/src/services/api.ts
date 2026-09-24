/**
 * API クライアント
 * Cloudflare Workers API を呼び出すためのクライアント
 */

interface RegistrationRequest {
  qrCodeData: string;
  eventUrl: string;
}

interface RegistrationResponse {
  success: boolean;
  participant?: {
    username: string;
    eventUrl: string;
    registeredAt: string;
  };
  error?: string;
  message?: string;
}

interface HealthResponse {
  success: boolean;
  data: {
    status: string;
    timestamp: string;
    uptime: number;
  };
}

class ApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  /**
   * 認証ヘッダーを取得
   */
  private getAuthHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * 参加者を登録
   */
  async registerParticipant(
    qrCodeData: string,
    eventUrl: string
  ): Promise<RegistrationResponse> {
    const response = await fetch(`${this.baseUrl}/api/registration/register`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        qrCodeData,
        eventUrl,
      }),
    });

    const data: RegistrationResponse = await response.json();
    return data;
  }

  /**
   * ヘルスチェック
   */
  async checkHealth(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseUrl}/api/health`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const data: HealthResponse = await response.json();
    return data;
  }
}

export default ApiClient;
