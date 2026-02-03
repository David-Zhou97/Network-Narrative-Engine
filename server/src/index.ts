/**
 * Network Narrative Engine - API Server
 *
 * Provides REST API endpoints for the narrative engine,
 * handling AI dialogue generation securely on the server side.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createApiRoutes } from './routes/api.js';

// Load environment variables
dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', createApiRoutes());

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Narrative Engine API server running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   API endpoint: http://localhost:${PORT}/api`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  Warning: ANTHROPIC_API_KEY not set. AI generation will fail.');
    console.warn('   Set it in .env file or as environment variable.');
  }
});

export default app;
