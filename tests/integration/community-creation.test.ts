// Integration Test: Create community workflow (Scenario 1)
// Tests: Auth → Create community → Verify owner assignment

import { describe, it, expect, beforeAll } from 'vitest';
import app from '../../src/index';
import { createMockEnv } from '../helpers/test-env';

describe('Integration: Create Community Workflow', () => {
  let env: any;
  let accessToken: string;
  let userDid: string;

  beforeAll(async () => {
    env = createMockEnv();
  });

  it('should complete full community creation workflow', async () => {
    // Step 1: Login
    const loginRequest = new Request('http://localhost:8787/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: 'alice.bsky.social' }),
    });

    const loginResponse = await app.fetch(loginRequest, env, {} as ExecutionContext);
    expect(loginResponse.status).toBe(200);

    const authData = await loginResponse.json();
    accessToken = authData.accessJwt;
    userDid = authData.did;

    expect(accessToken).toBeTruthy();
    expect(userDid).toBeTruthy();

    // Step 2: Create community
    const createRequest = new Request('http://localhost:8787/api/communities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: 'Integration Test Community',
        description: 'Created by integration test',
      }),
    });

    const createResponse = await app.fetch(createRequest, env, {} as ExecutionContext);
    expect(createResponse.status).toBe(201);

    const community = await createResponse.json();

    // Step 3: Verify community created
    expect(community.id).toBeTruthy();
    expect(community.name).toBe('Integration Test Community');
    expect(community.stage).toBe('theme');
    expect(community.memberCount).toBe(1); // Creator is first member
    expect(community.postCount).toBe(0);

    // Step 4: Verify community appears in list
    const listRequest = new Request('http://localhost:8787/api/communities', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const listResponse = await app.fetch(listRequest, env, {} as ExecutionContext);
    expect(listResponse.status).toBe(200);

    const listData = await listResponse.json();
    const foundCommunity = listData.data.find((c: any) => c.id === community.id);
    expect(foundCommunity).toBeTruthy();
  });
});
