/**
 * API Routes for the Narrative Engine
 */

import { Router } from 'express';
import { AIService } from '../services/ai.js';

export function createApiRoutes(): Router {
  const router = Router();
  const aiService = new AIService();

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

  return router;
}
