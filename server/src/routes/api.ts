/**
 * API Routes for the Narrative Engine
 */

import { Router } from 'express';
import type { Response } from 'express';
import { AIService } from '../services/ai.js';
import { StoryGeneratorService, type StreamingProgressEvent } from '../services/storyGenerator.js';
import type { StoryCreationInput, GraphGenerationConfig, GeneratedGraph } from '../types/storyCreation.js';

// In-memory storage for user-created stories (in production, use a database)
const userStories: Map<string, GeneratedGraph> = new Map();

export function createApiRoutes(): Router {
  const router = Router();
  const aiService = new AIService();
  const storyGenerator = new StoryGeneratorService();

  /**
   * POST /api/generate-turn
   * Generate a narrative turn with AI
   */
  router.post('/generate-turn', async (req, res) => {
    try {
      const { systemPrompt, userPrompt, temperature = 0.8, maxTokens = 1024 } = req.body;

      if (!systemPrompt || !userPrompt) {
        return res.status(400).json({
          error: 'Missing required fields: systemPrompt, userPrompt',
        });
      }

      const response = await aiService.complete({
        systemPrompt,
        userPrompt,
        temperature,
        maxTokens,
      });

      res.json({ response });
    } catch (error) {
      console.error('Error generating turn:', error);

      if (error instanceof Error && error.message.includes('API key')) {
        return res.status(401).json({ error: 'API key not configured' });
      }

      res.status(500).json({
        error: 'Failed to generate turn',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/generate-dialogue
   * Generate character dialogue
   */
  router.post('/generate-dialogue', async (req, res) => {
    try {
      const { systemPrompt, userPrompt, temperature = 0.8, maxTokens = 150 } = req.body;

      if (!systemPrompt || !userPrompt) {
        return res.status(400).json({
          error: 'Missing required fields: systemPrompt, userPrompt',
        });
      }

      const response = await aiService.complete({
        systemPrompt,
        userPrompt,
        temperature,
        maxTokens,
      });

      res.json({ response });
    } catch (error) {
      console.error('Error generating dialogue:', error);
      res.status(500).json({
        error: 'Failed to generate dialogue',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/stories
   * List available stories
   */
  router.get('/stories', (_req, res) => {
    // In a full implementation, this would load from a database or file system
    res.json({
      stories: [
        {
          id: 'detective-mystery',
          title: 'The Midnight Cipher',
          description: 'A detective noir mystery in a rain-soaked city',
          author: 'Narrative Engine Demo',
        },
      ],
    });
  });

  /**
   * GET /api/config
   * Get client configuration (safe to expose)
   */
  router.get('/config', (_req, res) => {
    res.json({
      aiEnabled: !!process.env.ANTHROPIC_API_KEY,
      version: '1.0.0',
    });
  });

  // ============================================================================
  // Story Generation Endpoints
  // ============================================================================

  /**
   * POST /api/generate-story
   * Generate a complete story graph from user input
   */
  router.post('/generate-story', async (req, res) => {
    try {
      const { input, config } = req.body as {
        input: StoryCreationInput;
        config?: Partial<GraphGenerationConfig>;
      };

      if (!input || !input.title || !input.plot) {
        return res.status(400).json({
          error: 'Missing required fields: input.title, input.plot',
        });
      }

      console.log(`Generating story: "${input.title}"`);

      const graph = await storyGenerator.generateStoryGraph(input, config);

      console.log(`Generated story with ${graph.nodes.length} nodes and ${graph.edges.length} edges`);

      res.json({
        success: true,
        graph,
        warnings: graph.warnings,
      });
    } catch (error) {
      console.error('Error generating story:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate story',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/generate-story-stream
   * Generate a story graph with Server-Sent Events for real-time progress updates
   * This uses a step-by-step approach to prevent context length issues
   */
  router.post('/generate-story-stream', async (req, res: Response) => {
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    // Helper to send SSE events
    const sendEvent = (event: StreamingProgressEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      const { input, config } = req.body as {
        input: StoryCreationInput;
        config?: Partial<GraphGenerationConfig>;
      };

      if (!input || !input.title || !input.plot) {
        sendEvent({
          type: 'error',
          message: 'Missing required fields: input.title, input.plot',
          recoverable: false,
        });
        res.end();
        return;
      }

      console.log(`Streaming story generation: "${input.title}"`);

      // Use the streaming generator
      const generator = storyGenerator.generateStoryGraphStreaming(input, config);

      for await (const event of generator) {
        sendEvent(event);

        // Check if client disconnected
        if (res.writableEnded) {
          console.log('Client disconnected during story generation');
          break;
        }
      }

      res.end();
    } catch (error) {
      console.error('Error in streaming story generation:', error);
      sendEvent({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        recoverable: false,
      });
      res.end();
    }
  });

  /**
   * GET /api/generate-story-stream
   * Alternative GET endpoint for EventSource compatibility
   * Query params: input (JSON string), config (JSON string, optional)
   */
  router.get('/generate-story-stream', async (req, res: Response) => {
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const sendEvent = (event: StreamingProgressEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      const inputStr = req.query.input as string;
      const configStr = req.query.config as string | undefined;

      if (!inputStr) {
        sendEvent({
          type: 'error',
          message: 'Missing required query parameter: input',
          recoverable: false,
        });
        res.end();
        return;
      }

      let input: StoryCreationInput;
      let config: Partial<GraphGenerationConfig> | undefined;

      try {
        input = JSON.parse(inputStr);
        if (configStr) {
          config = JSON.parse(configStr);
        }
      } catch {
        sendEvent({
          type: 'error',
          message: 'Invalid JSON in query parameters',
          recoverable: false,
        });
        res.end();
        return;
      }

      if (!input.title || !input.plot) {
        sendEvent({
          type: 'error',
          message: 'Missing required fields: input.title, input.plot',
          recoverable: false,
        });
        res.end();
        return;
      }

      console.log(`Streaming story generation (GET): "${input.title}"`);

      const generator = storyGenerator.generateStoryGraphStreaming(input, config);

      for await (const event of generator) {
        sendEvent(event);

        if (res.writableEnded) {
          console.log('Client disconnected during story generation');
          break;
        }
      }

      res.end();
    } catch (error) {
      console.error('Error in streaming story generation:', error);
      sendEvent({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        recoverable: false,
      });
      res.end();
    }
  });

  /**
   * POST /api/regenerate-node
   * Regenerate a single node in the story
   */
  router.post('/regenerate-node', async (req, res) => {
    try {
      const { graph, nodeId, instructions } = req.body as {
        graph: GeneratedGraph;
        nodeId: string;
        instructions?: string;
      };

      if (!graph || !nodeId) {
        return res.status(400).json({
          error: 'Missing required fields: graph, nodeId',
        });
      }

      const newNode = await storyGenerator.regenerateNode(graph, nodeId, instructions);

      res.json({
        success: true,
        node: newNode,
      });
    } catch (error) {
      console.error('Error regenerating node:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to regenerate node',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/regenerate-edge
   * Regenerate a single edge (choice) in the story
   */
  router.post('/regenerate-edge', async (req, res) => {
    try {
      const { graph, edgeId, instructions } = req.body as {
        graph: GeneratedGraph;
        edgeId: string;
        instructions?: string;
      };

      if (!graph || !edgeId) {
        return res.status(400).json({
          error: 'Missing required fields: graph, edgeId',
        });
      }

      const newEdge = await storyGenerator.regenerateEdge(graph, edgeId, instructions);

      res.json({
        success: true,
        edge: newEdge,
      });
    } catch (error) {
      console.error('Error regenerating edge:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to regenerate edge',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/publish-story
   * Publish a user-created story to the marketplace
   */
  router.post('/publish-story', async (req, res) => {
    try {
      const { graph, shortDescription, thumbnail, featured } = req.body as {
        graph: GeneratedGraph;
        shortDescription: string;
        thumbnail?: string;
        featured?: boolean;
      };

      if (!graph || !graph.metadata?.id) {
        return res.status(400).json({
          error: 'Missing required fields: graph with valid metadata.id',
        });
      }

      // Store the story
      userStories.set(graph.metadata.id, graph);

      console.log(`Published story: "${graph.metadata.title}" (${graph.metadata.id})`);

      res.json({
        success: true,
        storyId: graph.metadata.id,
        message: `Story "${graph.metadata.title}" published successfully`,
      });
    } catch (error) {
      console.error('Error publishing story:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to publish story',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/user-stories
   * Get all user-created stories with node type breakdown
   */
  router.get('/user-stories', (_req, res) => {
    const stories = Array.from(userStories.values()).map(graph => {
      // Calculate node type counts
      const nodeTypes = {
        entry: graph.nodes.filter(n => n.type === 'entry').length,
        story: graph.nodes.filter(n => n.type === 'story').length,
        branch: graph.nodes.filter(n => n.type === 'branch').length,
        converge: graph.nodes.filter(n => n.type === 'converge').length,
        ending: graph.nodes.filter(n => n.type === 'ending').length,
        anchor: graph.nodes.filter(n => n.type === 'anchor').length,
        transition: graph.nodes.filter(n => n.type === 'transition').length,
        merge: graph.nodes.filter(n => n.type === 'merge').length,
      };

      // Determine if story uses new architecture
      const usesNewArchitecture = nodeTypes.anchor > 0 || nodeTypes.transition > 0 || nodeTypes.merge > 0;

      return {
        id: graph.metadata.id,
        title: graph.metadata.title,
        description: graph.metadata.description,
        author: graph.metadata.author,
        tags: graph.metadata.tags,
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
        nodeTypes,
        usesNewArchitecture,
      };
    });

    res.json({ stories });
  });

  /**
   * GET /api/user-stories/:id
   * Get a specific user-created story
   */
  router.get('/user-stories/:id', (req, res) => {
    const { id } = req.params;
    const story = userStories.get(id);

    if (!story) {
      return res.status(404).json({
        error: 'Story not found',
      });
    }

    res.json({ story });
  });

  /**
   * DELETE /api/user-stories/:id
   * Delete a user-created story
   */
  router.delete('/user-stories/:id', (req, res) => {
    const { id } = req.params;

    if (!userStories.has(id)) {
      return res.status(404).json({
        error: 'Story not found',
      });
    }

    userStories.delete(id);

    res.json({
      success: true,
      message: 'Story deleted',
    });
  });

  return router;
}
