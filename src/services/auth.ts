// Atrarium MVP - Authentication Service
// JWT creation/verification with DID verification (OAuth 2.1)

import type { Env, DashboardJWTPayload, AuthResponse } from '../types';
import { SignJWT, jwtVerify } from 'jose';

// ============================================================================
// JWT Token Service
// ============================================================================

export class AuthService {
  private env: Env;
  private accessTokenTTL = 15 * 60; // 15 minutes
  private refreshTokenTTL = 60 * 24 * 60 * 60; // 60 days

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Create dashboard JWT (access token)
   * @param userDid User's DID
   * @param handle User's Bluesky handle
   * @returns JWT string
   */
  async createDashboardJWT(userDid: string, handle: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const hostname = this.getHostname();

    const payload: DashboardJWTPayload = {
      iss: `did:web:${hostname}`,
      sub: userDid,
      aud: `did:web:${hostname}`,
      handle,
      iat: now,
      exp: now + this.accessTokenTTL,
      jti: crypto.randomUUID(),
    };

    const secret = new TextEncoder().encode(this.env.JWT_SECRET);

    return await new SignJWT(payload as unknown as Record<string, unknown>)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(payload.iat)
      .setExpirationTime(payload.exp)
      .setJti(payload.jti)
      .sign(secret);
  }

  /**
   * Create refresh JWT (for token renewal)
   */
  async createRefreshJWT(userDid: string, handle: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const hostname = this.getHostname();

    const payload = {
      iss: `did:web:${hostname}`,
      sub: userDid,
      aud: `did:web:${hostname}`,
      handle,
      iat: now,
      exp: now + this.refreshTokenTTL,
      jti: crypto.randomUUID(),
      type: 'refresh',
    };

    const secret = new TextEncoder().encode(this.env.JWT_SECRET);

    return await new SignJWT(payload as unknown as Record<string, unknown>)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(payload.iat)
      .setExpirationTime(payload.exp)
      .setJti(payload.jti)
      .sign(secret);
  }

  /**
   * Verify dashboard JWT and return payload
   */
  async verifyDashboardJWT(token: string): Promise<DashboardJWTPayload> {
    const secret = new TextEncoder().encode(this.env.JWT_SECRET);

    try {
      const { payload } = await jwtVerify(token, secret, {
        algorithms: ['HS256'],
      });

      return payload as unknown as DashboardJWTPayload;
    } catch (err) {
      throw new Error('Invalid or expired JWT');
    }
  }

  /**
   * Verify refresh token and issue new access token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthResponse> {
    const payload = await this.verifyDashboardJWT(refreshToken);

    // Check if refresh token was already used (token rotation)
    const isUsed = await this.env.POST_CACHE.get(`refresh:used:${payload.jti}`);
    if (isUsed) {
      // Refresh token reuse detected - revoke all user tokens (security measure)
      throw new Error('Refresh token reuse detected');
    }

    // Mark refresh token as used
    await this.env.POST_CACHE.put(`refresh:used:${payload.jti}`, '1', {
      expirationTtl: this.refreshTokenTTL,
    });

    // Issue new tokens
    const accessJwt = await this.createDashboardJWT(payload.sub, payload.handle);
    const refreshJwt = await this.createRefreshJWT(payload.sub, payload.handle);

    return {
      accessJwt,
      refreshJwt,
      did: payload.sub,
      handle: payload.handle,
    };
  }

  /**
   * Simplified OAuth flow (Phase 0: mock implementation)
   * In production: Redirect to Bluesky OAuth, handle callback
   */
  async initiateOAuthLogin(handle: string): Promise<string> {
    // Phase 0: Simplified flow
    // In production: Use @atproto/oauth-client
    // For now, generate mock DID from handle
    const mockDid = `did:plc:${handle.replace(/[^a-z0-9]/g, '')}`;

    // Create tokens immediately (skip OAuth for Phase 0)
    const accessJwt = await this.createDashboardJWT(mockDid, handle);
    const refreshJwt = await this.createRefreshJWT(mockDid, handle);

    // Return mock auth response as JSON string (in production: redirect URL)
    return JSON.stringify({
      accessJwt,
      refreshJwt,
      did: mockDid,
      handle,
    });
  }

  /**
   * Handle OAuth callback (Phase 0: mock implementation)
   */
  async handleOAuthCallback(_code: string, _state: string): Promise<AuthResponse> {
    // Phase 0: Simplified flow
    // In production: Exchange code for tokens with Bluesky OAuth server
    throw new Error('OAuth callback not implemented in Phase 0');
  }

  /**
   * Extract user DID from Authorization header
   */
  async extractUserFromHeader(authHeader: string | null): Promise<string> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7);
    const payload = await this.verifyDashboardJWT(token);

    return payload.sub; // User DID
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Get hostname for DID construction
   */
  private getHostname(): string {
    // In production: Extract from request
    // For Phase 0: Use environment variable or default
    return this.env.ENVIRONMENT === 'production'
      ? 'atrarium.example.com'
      : '127.0.0.1:8787';
  }
}
