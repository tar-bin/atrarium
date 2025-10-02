// Contract Test: POST /api/communities
// Verifies create community request/response

import { describe, it, expect } from 'vitest';
import app from '../../../src/index';
import { createMockEnv, createMockJWT } from '../../helpers/test-env';

describe('Contract: POST /api/communities', () => {
  let env: any;
  let jwt: string;

  beforeEach(async () => {
    env = createMockEnv();
    jwt = await createMockJWT('did:plc:test123', 'test.bsky.social');
  });

  it('should require authentication', async () => {
    const request = new Request('http://localhost:8787/api/communities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Community' }),
    });

    const response = await app.fetch(request, env, {} as ExecutionContext);
    expect(response.status).toBe(401);
  });

  it('should require name field', async () => {
    const request = new Request('http://localhost:8787/api/communities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({}),
    });

    const response = await app.fetch(request, env, {} as ExecutionContext);
    expect(response.status).toBe(400);
  });

  it('should create community with valid data', async () => {
    const request = new Request('http://localhost:8787/api/communities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        name: 'Tech Community',
        description: 'A community for tech discussions',
      }),
    });

    const response = await app.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(201);
    const community = await response.json();

    expect(community).toHaveProperty('id');
    expect(community).toHaveProperty('name', 'Tech Community');
    expect(community).toHaveProperty('stage', 'theme');
    expect(community).toHaveProperty('memberCount', 1);
    expect(community).toHaveProperty('postCount', 0);
  });
});
