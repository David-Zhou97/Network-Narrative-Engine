/**
 * API Client - Connects frontend to backend server
 */

import type {
  StoryCreationInput,
  GraphGenerationConfig,
  GeneratedGraph,
  GeneratedNode,
  GeneratedEdge,
} from '../../../src/types/storyCreation';

// Streaming progress event types (matches server-side types)
export type StreamingProgressEvent =
  | { type: 'start'; message: string; totalSteps: number }
  | { type: 'step'; step: number; message: string; data?: unknown }
  | { type: 'node_generated'; node: GeneratedNode }
  | { type: 'edge_generated'; edge: GeneratedEdge }
  | { type: 'branch_start'; branchIndex: number; totalBranches: number; sourceNode: string }
  | { type: 'branch_complete'; branchIndex: number; nodesGenerated: number; edgesGenerated: number }
  | { type: 'error'; message: string; recoverable: boolean }
  | { type: 'complete'; graph: GeneratedGraph };

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

export interface StoryGenerationResponse {
  success: boolean;
  graph?: GeneratedGraph;
  error?: string;
  warnings?: string[];
}

export interface UserStoryInfo {
  id: string;
  title: string;
  description: string;
  author: string;
  tags: string[];
  nodeCount: number;
  edgeCount: number;
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

  // ============================================================================
  // Story Generation Methods
  // ============================================================================

  async generateStory(
    input: StoryCreationInput,
    config?: Partial<GraphGenerationConfig>
  ): Promise<StoryGenerationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate-story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input, config }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        // Prefer the detailed message over the generic error
        return {
          success: false,
          error: error.message || error.error || `API error: ${response.status}`,
        };
      }

      return response.json();
    } catch (err) {
      // Handle network errors
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('fetch') || message.includes('network') || message.includes('Failed to fetch')) {
        return {
          success: false,
          error: 'Unable to connect to the server. Please ensure the backend is running (npm run dev:server).',
        };
      }
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Generate a story graph with real-time streaming progress updates.
   * Uses Server-Sent Events (SSE) for real-time feedback.
   */
  async generateStoryStreaming(
    input: StoryCreationInput,
    config: Partial<GraphGenerationConfig> | undefined,
    onEvent: (event: StreamingProgressEvent) => void
  ): Promise<StoryGenerationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate-story-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input, config }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        return {
          success: false,
          error: error.message || error.error || `API error: ${response.status}`,
        };
      }

      if (!response.body) {
        return {
          success: false,
          error: 'No response body received',
        };
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalGraph: GeneratedGraph | undefined;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr) {
              try {
                const event = JSON.parse(jsonStr) as StreamingProgressEvent;
                onEvent(event);

                // Capture the final graph
                if (event.type === 'complete') {
                  finalGraph = event.graph;
                }

                // Handle errors
                if (event.type === 'error' && !event.recoverable) {
                  return {
                    success: false,
                    error: event.message,
                  };
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE event:', parseError);
              }
            }
          }
        }
      }

      if (finalGraph) {
        return {
          success: true,
          graph: finalGraph,
          warnings: finalGraph.warnings,
        };
      }

      return {
        success: false,
        error: 'Stream ended without complete event',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('fetch') || message.includes('network') || message.includes('Failed to fetch')) {
        return {
          success: false,
          error: 'Unable to connect to the server. Please ensure the backend is running (npm run dev:server).',
        };
      }
      return {
        success: false,
        error: message,
      };
    }
  }

  async regenerateNode(
    graph: GeneratedGraph,
    nodeId: string,
    instructions?: string
  ): Promise<{ success: boolean; node?: GeneratedNode; error?: string }> {
    const response = await fetch(`${this.baseUrl}/api/regenerate-node`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ graph, nodeId, instructions }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        success: false,
        error: error.error || `API error: ${response.status}`,
      };
    }

    return response.json();
  }

  async regenerateEdge(
    graph: GeneratedGraph,
    edgeId: string,
    instructions?: string
  ): Promise<{ success: boolean; edge?: GeneratedEdge; error?: string }> {
    const response = await fetch(`${this.baseUrl}/api/regenerate-edge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ graph, edgeId, instructions }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        success: false,
        error: error.error || `API error: ${response.status}`,
      };
    }

    return response.json();
  }

  async publishStory(
    graph: GeneratedGraph,
    shortDescription: string,
    thumbnail?: string,
    featured?: boolean
  ): Promise<{ success: boolean; storyId?: string; error?: string }> {
    const response = await fetch(`${this.baseUrl}/api/publish-story`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ graph, shortDescription, thumbnail, featured }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        success: false,
        error: error.error || `API error: ${response.status}`,
      };
    }

    return response.json();
  }

  async getUserStories(): Promise<{ stories: UserStoryInfo[] }> {
    const response = await fetch(`${this.baseUrl}/api/user-stories`);

    if (!response.ok) {
      throw new Error(`Failed to get user stories: ${response.status}`);
    }

    return response.json();
  }

  async getUserStory(id: string): Promise<{ story: GeneratedGraph }> {
    const response = await fetch(`${this.baseUrl}/api/user-stories/${id}`);

    if (!response.ok) {
      throw new Error(`Failed to get story: ${response.status}`);
    }

    return response.json();
  }

  async deleteUserStory(id: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/user-stories/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete story: ${response.status}`);
    }

    return response.json();
  }
}

// Singleton instance
export const apiClient = new APIClient();
