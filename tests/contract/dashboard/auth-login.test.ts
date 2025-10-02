// Contract Test: POST /api/auth/login
// Verifies OAuth redirect response (Phase 0: mock implementation)

import { describe, it, expect, beforeEach } from 'vitest';
import app from '../../../src/index';
import { createMockEnv } from '../../helpers/test-env';
import type { AuthResponse, ErrorResponse } from '../../../src/types';

describe('Contract: POST /api/auth/login', () => {
  let env: any;

  beforeEach(() => {
    env = createMockEnv();
  });

  it('should require handle parameter', async () => {
    const request = new Request('http://localhost:8787/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await app.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(400);
    const error = await response.json() as ErrorResponse;
    expect(error).toHaveProperty('error', 'InvalidRequest');
  });

  it('should accept valid handle', async () => {
    const request = new Request('http://localhost:8787/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: 'alice.bsky.social' }),
    });

    const response = await app.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(200);
    const authResponse = await response.json() as AuthResponse;

    // Phase 0: Mock OAuth returns tokens directly
    expect(authResponse).toHaveProperty('accessJwt');
    expect(authResponse).toHaveProperty('refreshJwt');
    expect(authResponse).toHaveProperty('did');
    expect(authResponse).toHaveProperty('handle');

    expect(typeof authResponse.accessJwt).toBe('string');
    expect(typeof authResponse.refreshJwt).toBe('string');
    expect(authResponse.handle).toBe('alice.bsky.social');
  });

  it('should generate valid DID from handle', async () => {
    const request = new Request('http://localhost:8787/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: 'bob.bsky.social' }),
    });

    const response = await app.fetch(request, env, {} as ExecutionContext);
    const authResponse = await response.json() as AuthResponse;

    expect(authResponse.did).toMatch(/^did:plc:/);
  });

  it('should return refresh token for token renewal', async () => {
    const request = new Request('http://localhost:8787/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: 'charlie.bsky.social' }),
    });

    const response = await app.fetch(request, env, {} as ExecutionContext);
    const authResponse = await response.json() as AuthResponse;

    expect(authResponse.refreshJwt).toBeTruthy();
    expect(authResponse.refreshJwt).not.toBe(authResponse.accessJwt);
  });
});
