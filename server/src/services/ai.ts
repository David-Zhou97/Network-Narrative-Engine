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

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async complete(request: CompletionRequest): Promise<string> {
    if (!this.apiKey) {
      console.warn('ANTHROPIC_API_KEY not configured - AI features disabled');
      throw new Error('ANTHROPIC_API_KEY not configured. Please set this environment variable to enable AI story generation.');
    }

    console.log(`Making AI request with model: ${this.model}`);

    try {
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
        console.error(`Anthropic API error: ${response.status}`, errorText);
        throw new Error(`AI API error (${response.status}): ${errorText.slice(0, 200)}`);
      }

      const data = await response.json();

      // Extract text from response
      const textContent = data.content?.find(
        (block: { type: string }) => block.type === 'text'
      );

      if (!textContent?.text) {
        console.error('No text content in AI response:', JSON.stringify(data).slice(0, 500));
        throw new Error('AI returned empty response');
      }

      console.log(`AI response received (${textContent.text.length} chars)`);
      return textContent.text;
    } catch (error) {
      if (error instanceof Error) {
        // Re-throw with more context if it's a fetch error
        if (error.message.includes('fetch')) {
          throw new Error(`Network error connecting to AI service: ${error.message}`);
        }
        throw error;
      }
      throw new Error('Unknown error during AI request');
    }
  }
}
