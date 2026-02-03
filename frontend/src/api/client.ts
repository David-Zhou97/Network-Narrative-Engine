/**
 * API Client - Connects frontend to backend server
 */

export interface CompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
}

export interface APIConfig {
  aiEnabled: boolean;
  version: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * API Client that implements the AIAPIClient interface
 * for use with DialogueGenerator
 */
export class APIClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async complete(request: CompletionRequest): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate-turn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  }

  async getConfig(): Promise<APIConfig> {
    const response = await fetch(`${this.baseUrl}/api/config`);

    if (!response.ok) {
      throw new Error(`Failed to get config: ${response.status}`);
    }

    return response.json();
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const apiClient = new APIClient();
