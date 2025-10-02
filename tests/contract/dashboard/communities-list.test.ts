// Contract Test: GET /api/communities
// Verifies list communities response with JWT authentication

import { describe, it, expect, beforeEach } from 'vitest';
import app from '../../../src/index';
import { createMockEnv, createMockJWT } from '../../helpers/test-env';
import type { PaginatedResponse, CommunityResponse, ErrorResponse } from '../../../src/types';

describe('Contract: GET /api/communities', () => {
  let env: any;

  beforeEach(() => {
    env = createMockEnv();
  });

  it('should require JWT authentication', async () => {
    const request = new Request('http://localhost:8787/api/communities');

    const response = await app.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(401);
    const error = await response.json() as ErrorResponse;
    expect(error).toHaveProperty('error', 'Unauthorized');
  });

  it('should accept valid JWT', async () => {
    const jwt = await createMockJWT('did:plc:test123', 'test.bsky.social');
    const request = new Request('http://localhost:8787/api/communities', {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    const response = await app.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(200);
    const result = await response.json() as PaginatedResponse<CommunityResponse>;
    expect(result).toHaveProperty('data');
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('should reject invalid JWT', async () => {
    const request = new Request('http://localhost:8787/api/communities', {
      headers: { Authorization: 'Bearer invalid-jwt' },
    });

    const response = await app.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(401);
  });

  it('should return communities array with correct structure', async () => {
    const jwt = await createMockJWT('did:plc:test123', 'test.bsky.social');
    const request = new Request('http://localhost:8787/api/communities', {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    const response = await app.fetch(request, env, {} as ExecutionContext);
    const result = await response.json() as PaginatedResponse<CommunityResponse>;

    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);

    // Each community should have required fields
    if (result.data.length > 0) {
      const community = result.data[0];
      if (community) {
        expect(community).toHaveProperty('id');
        expect(community).toHaveProperty('name');
        expect(community).toHaveProperty('stage');
        expect(community).toHaveProperty('memberCount');
        expect(community).toHaveProperty('postCount');
        expect(community).toHaveProperty('createdAt');
      }
    }
  });
});
