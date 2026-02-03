/**
 * AI Service - Handles communication with Anthropic API
 */

export interface CompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
}

export class AIService {
  private apiKey: string | undefined;
  private model: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
    this.baseUrl = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
  }

  async complete(request: CompletionRequest): Promise<string> {
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        system: request.systemPrompt,
        messages: [
          {
            role: 'user',
            content: request.userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Extract text from response
    const textContent = data.content?.find(
      (block: { type: string }) => block.type === 'text'
    );

    return textContent?.text ?? '';
  }
}
