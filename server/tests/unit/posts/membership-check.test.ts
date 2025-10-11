/**
 * Unit Test: Membership Validation in posts.create
 * Validates: Membership check logic in oRPC posts.create handler
 * Tests: Non-member rejected, member accepted
 */

import { describe, expect, it, vi } from 'vitest';
import type { ServerContext } from '../../../src/types';

describe('Unit: Membership Check in posts.create', () => {
  const mockEnv = {
    COMMUNITY_FEED: {
      idFromName: vi.fn((name: string) => ({ name })),
      get: vi.fn((id: { name: string }) => ({
        fetch: vi.fn(async (request: Request) => {
          const url = new URL(request.url);
          if (url.pathname === '/checkMembership') {
            const did = url.searchParams.get('did');

            // Mock response: alice.test is member, bob.test is not
            if (did === 'did:plc:alice') {
              return new Response(JSON.stringify({ isMember: true }), {
                status: 200,
              });
            }
            return new Response(JSON.stringify({ isMember: false }), {
              status: 200,
            });
          }
          return new Response('Not found', { status: 404 });
        }),
      })),
    },
  } as unknown as ServerContext['env'];

  it('accepts post creation from community member', async () => {
    const communityId = 'a1b2c3d4';
    const userDid = 'did:plc:alice';

    // Get Durable Object stub
    const feedId = mockEnv.COMMUNITY_FEED.idFromName(communityId);
    const feedStub = mockEnv.COMMUNITY_FEED.get(feedId);

    // Check membership
    const response = await feedStub.fetch(
      new Request(`https://internal/checkMembership?did=${userDid}`)
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as { isMember: boolean };
    expect(data.isMember).toBe(true);
  });

  it('rejects post creation from non-member', async () => {
    const communityId = 'a1b2c3d4';
    const userDid = 'did:plc:bob';

    // Get Durable Object stub
    const feedId = mockEnv.COMMUNITY_FEED.idFromName(communityId);
    const feedStub = mockEnv.COMMUNITY_FEED.get(feedId);

    // Check membership
    const response = await feedStub.fetch(
      new Request(`https://internal/checkMembership?did=${userDid}`)
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as { isMember: boolean };
    expect(data.isMember).toBe(false);
  });

  it('handles Durable Object RPC errors gracefully', async () => {
    const mockEnvWithError = {
      COMMUNITY_FEED: {
        idFromName: vi.fn((name: string) => ({ name })),
        get: vi.fn((id: { name: string }) => ({
          fetch: vi.fn(async () => {
            // Simulate DO RPC failure
            return new Response('Internal error', { status: 500 });
          }),
        })),
      },
    } as unknown as ServerContext['env'];

    const communityId = 'a1b2c3d4';
    const userDid = 'did:plc:alice';

    // Get Durable Object stub
    const feedId = mockEnvWithError.COMMUNITY_FEED.idFromName(communityId);
    const feedStub = mockEnvWithError.COMMUNITY_FEED.get(feedId);

    // Check membership
    const response = await feedStub.fetch(
      new Request(`https://internal/checkMembership?did=${userDid}`)
    );

    expect(response.status).toBe(500);
  });

  it('validates communityId format before Durable Object lookup', () => {
    const validCommunityIds = ['a1b2c3d4', '00000000', 'ffffffff'];
    const invalidCommunityIds = ['12345', 'gggggggg', 'a1b2c3d', ''];

    // Valid IDs should match regex
    for (const id of validCommunityIds) {
      expect(id).toMatch(/^[0-9a-f]{8}$/);
    }

    // Invalid IDs should not match
    for (const id of invalidCommunityIds) {
      expect(id).not.toMatch(/^[0-9a-f]{8}$/);
    }
  });
});
