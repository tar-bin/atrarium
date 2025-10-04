// Contract Test: POST /api/communities/:id/close (T000b)
// Validates community closure endpoint with ownership verification

import { describe, it, expect, beforeEach } from 'vitest';
import app from '../../../src/index';
import { createMockEnv, createMockJWT } from '../../helpers/test-env';
import { CommunityModel } from '../../../src/models/community';
import { MembershipModel } from '../../../src/models/membership';

describe('POST /api/communities/:id/close', () => {
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
        name: 'Test Community for Closure',
        description: 'This community will be archived',
      },
      ownerDid
    );
    communityId = community.id;

    // Add a regular member
    const membershipModel = new MembershipModel(env);
    await membershipModel.create(communityId, memberDid, 'member');
  });

  it('should require authentication', async () => {
    const request = new Request(`http://localhost/api/communities/${communityId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await app.fetch(request, env, {} as ExecutionContext);
    expect(response.status).toBe(401);
  });

  it('should close community successfully when called by owner', async () => {
    const request = new Request(`http://localhost/api/communities/${communityId}/close`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerJwt}`,
        'Content-Type': 'application/json',
      },
    });

    const response = await app.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.community.archivedAt).toBeTypeOf('number');
    expect(data.community.id).toBe(communityId);

    // Verify community is archived in database
    const communityModel = new CommunityModel(env);
    const archivedCommunity = await communityModel.getById(communityId);
    expect(archivedCommunity).toBeNull(); // getById excludes archived communities
  });

  it('should return 403 Forbidden when called by non-owner', async () => {
    const request = new Request(`http://localhost/api/communities/${communityId}/close`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${memberJwt}`,
        'Content-Type': 'application/json',
      },
    });

    const response = await app.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden');
    expect(data.message).toContain('owner');
  });

  it('should return 409 Conflict when community is already archived', async () => {
    // Archive the community first
    const communityModel = new CommunityModel(env);
    await communityModel.archive(communityId);

    const request = new Request(`http://localhost/api/communities/${communityId}/close`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerJwt}`,
        'Content-Type': 'application/json',
      },
    });

    const response = await app.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error).toBe('Conflict');
    expect(data.message).toContain('already archived');
  });

  it('should return 404 Not Found for non-existent community', async () => {
    const request = new Request('http://localhost/api/communities/non-existent-id/close', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerJwt}`,
        'Content-Type': 'application/json',
      },
    });

    const response = await app.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('NotFound');
  });
});
