// Atrarium MVP - Authentication Routes
// OAuth login initiation and callback handling

import { Hono } from 'hono';
import { LoginRequestSchema, validateRequest } from '../schemas/validation';
import { AuthService } from '../services/auth';
import type { AuthResponse, Env, HonoVariables } from '../types';

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// ============================================================================
// POST /login
// Initiate OAuth login (Phase 0: simplified mock implementation)
// Mounted at /api/auth, so full path is /api/auth/login
// ============================================================================

app.post('/login', async (c) => {
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
  } catch (_err) {
    return c.json({ error: 'InternalServerError', message: 'Login failed' }, 500);
  }
});

// ============================================================================
// GET /callback
// OAuth callback handler (Phase 0: not implemented)
// Mounted at /api/auth, so full path is /api/auth/callback
// ============================================================================

app.get('/callback', async (c) => {
  return c.json(
    {
      error: 'NotImplemented',
      message: 'OAuth callback not implemented in Phase 0',
    },
    501
  );
});

// ============================================================================
// POST /refresh
// Refresh access token using refresh token
// Mounted at /api/auth, so full path is /api/auth/refresh
// ============================================================================

app.post('/refresh', async (c) => {
  try {
    const body = await c.req.json();
    const refreshToken = body.refreshToken;

    if (!refreshToken) {
      return c.json({ error: 'InvalidRequest', message: 'Missing refreshToken' }, 400);
    }

    const authService = new AuthService(c.env);
    const response = await authService.refreshAccessToken(refreshToken);

    return c.json(response);
  } catch (_err) {
    return c.json({ error: 'Unauthorized', message: 'Invalid refresh token' }, 401);
  }
});

// ============================================================================
// POST /pds-login
// Login with PDS access token (for local development and testing)
// Mounted at /api/auth, so full path is /api/auth/pds-login
// ============================================================================

app.post('/pds-login', async (c) => {
  try {
    const body = await c.req.json();
    const { accessJwt, did, handle } = body;

    if (!accessJwt || !did || !handle) {
      return c.json(
        {
          error: 'InvalidRequest',
          message: 'Missing required fields: accessJwt, did, handle',
        },
        400
      );
    }

    // TODO: Verify PDS JWT validity (optional for development)
    // For now, trust the provided DID and handle

    const authService = new AuthService(c.env);
    const atriumAccessJwt = await authService.createDashboardJWT(did, handle);
    const atriumRefreshJwt = await authService.createRefreshJWT(did, handle);

    return c.json({
      accessJwt: atriumAccessJwt,
      refreshJwt: atriumRefreshJwt,
      did,
      handle,
    });
  } catch (_err) {
    return c.json({ error: 'InternalServerError', message: 'PDS login failed' }, 500);
  }
});

export default app;
