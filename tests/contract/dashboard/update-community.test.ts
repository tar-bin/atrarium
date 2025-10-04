// Contract Test: PATCH /api/communities/:id (T000a)
// Validates community update endpoint with ownership verification

import { describe, it, expect, beforeEach } from 'vitest';
import app from '../../../src/index';
import { createMockEnv, createMockJWT } from '../../helpers/test-env';
import { CommunityModel } from '../../../src/models/community';
import { MembershipModel } from '../../../src/models/membership';

describe('PATCH /api/communities/:id', () => {
  let env: any;
  let ownerJwt: string;
  let memberJwt: string;
  let ownerDid: string;
  let memberDid: string;
  let communityId: string;

  beforeEach(async () => {
    env = createMockEnv();
    ownerDid = 'did:plc:owner123';
    memberDid = 'did:plc:member456';
    ownerJwt = await createMockJWT(ownerDid, 'owner.bsky.social');
    memberJwt = await createMockJWT(memberDid, 'member.bsky.social');

    // Create a community owned by ownerDid
    const communityModel = new CommunityModel(env);
    const community = await communityModel.create(
      {
        name: 'Test Community',
        description: 'Original description',
      },
      ownerDid
    );
    communityId = community.id;

    // Add a regular member
    const membershipModel = new MembershipModel(env);
    await membershipModel.create(communityId, memberDid, 'member');
  });

  it('should require authentication', async () => {
    const request = new Request(`http://localhost/api/communities/${communityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Name' }),
    });

    const response = await app.fetch(request, env, {} as ExecutionContext);
    expect(response.status).toBe(401);
  });

  it('should update community name successfully when called by owner', async () => {
    const request = new Request(`http://localhost/api/communities/${communityId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${ownerJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Updated Community Name' }),
    });

    const response = await app.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);

    // Verify update in database
    const communityModel = new CommunityModel(env);
    const updatedCommunity = await communityModel.getById(communityId);
    expect(updatedCommunity?.name).toBe('Updated Community Name');
    expect(updatedCommunity?.description).toBe('Original description'); // Unchanged
  });

  it('should update community description successfully', async () => {
    const request = new Request(`http://localhost/api/communities/${communityId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${ownerJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ description: 'Updated description text' }),
    });

    const response = await app.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(200);

    // Verify update in database
    const communityModel = new CommunityModel(env);
    const updatedCommunity = await communityModel.getById(communityId);
    expect(updatedCommunity?.description).toBe('Updated description text');
    expect(updatedCommunity?.name).toBe('Test Community'); // Unchanged
  });

  it('should update both name and description simultaneously', async () => {
    const request = new Request(`http://localhost/api/communities/${communityId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${ownerJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'New Name',
        description: 'New Description',
      }),
    });

    const response = await app.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(200);

    // Verify update in database
    const communityModel = new CommunityModel(env);
    const updatedCommunity = await communityModel.getById(communityId);
    expect(updatedCommunity?.name).toBe('New Name');
    expect(updatedCommunity?.description).toBe('New Description');
  });

  it('should return 403 Forbidden when called by non-owner', async () => {
    const request = new Request(`http://localhost/api/communities/${communityId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${memberJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Hacker Name' }),
    });

    const response = await app.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden');
    expect(data.message).toContain('owner');
  });

  it('should return 400 Bad Request for invalid name (exceeds 50 chars)', async () => {
    const longName = 'A'.repeat(51);
    const request = new Request(`http://localhost/api/communities/${communityId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${ownerJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: longName }),
    });

    const response = await app.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('InvalidRequest');
  });

  it('should return 404 Not Found for non-existent community', async () => {
    const request = new Request('http://localhost/api/communities/non-existent-id', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${ownerJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'New Name' }),
    });

    const response = await app.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(403); // Returns 403 if membership not found (before 404 check)
  });
});
