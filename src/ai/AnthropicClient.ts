/**
 * AnthropicClient - Client for Anthropic's Claude API
 */

import type { AIAPIClient } from './DialogueGenerator';

export interface AnthropicConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export class AnthropicClient implements AIAPIClient {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: AnthropicConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'claude-sonnet-4-20250514';
    this.baseUrl = config.baseUrl ?? 'https://api.anthropic.com';
  }

  async complete(request: {
    systemPrompt: string;
    userPrompt: string;
    temperature: number;
    maxTokens: number;
  }): Promise<string> {
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
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    // Extract text from response
    const textContent = data.content?.find(
      (block: { type: string }) => block.type === 'text'
    );

    return textContent?.text ?? '';
  }
}

/**
 * Create an Anthropic client from environment variable
 */
export function createAnthropicClient(
  apiKey?: string,
  model?: string
): AnthropicClient {
  const key = apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      'Anthropic API key required. Set ANTHROPIC_API_KEY environment variable or pass apiKey.'
    );
  }

  return new AnthropicClient({ apiKey: key, model });
}
