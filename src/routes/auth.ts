// Atrarium MVP - Authentication Routes
// OAuth login initiation and callback handling

import { Hono } from 'hono';
import type { Env, AuthResponse } from '../types';
import { AuthService } from '../services/auth';
import { validateRequest, LoginRequestSchema } from '../schemas/validation';

const app = new Hono<{ Bindings: Env }>();

// ============================================================================
// POST /api/auth/login
// Initiate OAuth login (Phase 0: simplified mock implementation)
// ============================================================================

app.post('/api/auth/login', async (c) => {
  try {
    const body = await c.req.json();
    const validation = await validateRequest(LoginRequestSchema, body);

    if (!validation.success) {
      return c.json({ error: 'InvalidRequest', message: validation.error }, 400);
    }

    const { handle } = validation.data;
    const authService = new AuthService(c.env);

    // Phase 0: Simplified flow (mock OAuth)
    const result = await authService.initiateOAuthLogin(handle);
    const authResponse: AuthResponse = JSON.parse(result);

    return c.json(authResponse);
  } catch (err) {
    console.error('[/api/auth/login] Error:', err);
    return c.json({ error: 'InternalServerError', message: 'Login failed' }, 500);
  }
});

// ============================================================================
// GET /api/auth/callback
// OAuth callback handler (Phase 0: not implemented)
// ============================================================================

app.get('/api/auth/callback', async (c) => {
  return c.json(
    {
      error: 'NotImplemented',
      message: 'OAuth callback not implemented in Phase 0',
    },
    501
  );
});

// ============================================================================
// POST /api/auth/refresh
// Refresh access token using refresh token
// ============================================================================

app.post('/api/auth/refresh', async (c) => {
  try {
    const body = await c.req.json();
    const refreshToken = body.refreshToken;

    if (!refreshToken) {
      return c.json({ error: 'InvalidRequest', message: 'Missing refreshToken' }, 400);
    }

    const authService = new AuthService(c.env);
    const response = await authService.refreshAccessToken(refreshToken);

    return c.json(response);
  } catch (err) {
    console.error('[/api/auth/refresh] Error:', err);
    return c.json({ error: 'Unauthorized', message: 'Invalid refresh token' }, 401);
  }
});

export default app;
