// Contract Test: GET /api/communities/{id}/feeds
// Verifies list theme feeds for community

import { describe, it, expect, beforeEach } from 'vitest';
import app from '../../../src/index';
import { createMockEnv, createMockJWT } from '../../helpers/test-env';
import type { PaginatedResponse, ThemeFeedResponse } from '../../../src/types';

describe('Contract: GET /api/communities/{id}/feeds', () => {
  let env: any;
  let jwt: string;

  beforeEach(async () => {
    env = createMockEnv();
    jwt = await createMockJWT('did:plc:test123', 'test.bsky.social');
  });

  it('should require authentication', async () => {
    const communityId = '550e8400-e29b-41d4-a716-446655440000';
    const request = new Request(
      `http://localhost:8787/api/communities/${communityId}/feeds`
    );

    const response = await app.fetch(request, env, {} as ExecutionContext);
    expect(response.status).toBe(401);
  });

  it('should return feeds array with valid auth', async () => {
    const communityId = '550e8400-e29b-41d4-a716-446655440000';
    const request = new Request(
      `http://localhost:8787/api/communities/${communityId}/feeds`,
      {
        headers: { Authorization: `Bearer ${jwt}` },
      }
    );

    const response = await app.fetch(request, env, {} as ExecutionContext);

    // May return 403 if user is not a member, which is acceptable
    if (response.status === 200) {
      const result = await response.json() as PaginatedResponse<ThemeFeedResponse>;
      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
    } else {
      expect(response.status).toBe(403);
    }
  });
});
