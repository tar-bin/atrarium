// Atrarium MVP - Communities Routes
// Community management API

import { Hono } from 'hono';
import { CreateCommunitySchema, validateRequest } from '../schemas/validation';
import { AuthService } from '../services/auth';
import type { CommunityResponse, Env, HonoVariables } from '../types';

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// ============================================================================
// Middleware: JWT Authentication
// ============================================================================

app.use('*', async (c, next) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const authService = new AuthService(c.env);
    const userDid = await authService.extractUserFromHeader(authHeader);

    // Store user DID in context
    c.set('userDid', userDid);

    await next();
  } catch (_err) {
    return c.json({ error: 'Unauthorized', message: 'Invalid or missing JWT' }, 401);
  }
});

// ============================================================================
// GET /api/communities
// List communities where user is a member (PDS-first architecture)
// ============================================================================

app.get('/', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const pdsUrl = c.env.PDS_URL || 'http://pds:3000';

    // Query PDS for user's membership records (public endpoint, no auth needed)
    const membershipsUrl = `${pdsUrl}/xrpc/com.atproto.repo.listRecords?repo=${userDid}&collection=net.atrarium.group.membership&limit=100`;
    const membershipsResponse = await fetch(membershipsUrl);

    if (!membershipsResponse.ok) {
      throw new Error(`Failed to fetch memberships: ${membershipsResponse.statusText}`);
    }

    const membershipsData = (await membershipsResponse.json()) as {
      records: Array<{
        uri: string;
        value: {
          community: string;
          role: string;
          status: string;
          active: boolean;
        };
      }>;
    };

    // Filter active memberships
    const activeMemberships = membershipsData.records.filter(
      (record) => record.value.active && record.value.status === 'active'
    );

    // Fetch community configs for each membership
    const communities = await Promise.all(
      activeMemberships.map(async (membership) => {
        try {
          const communityUri = membership.value.community;

          // Parse community URI: at://did:plc:xxx/net.atrarium.group.config/rkey
          const parts = communityUri.replace('at://', '').split('/');
          const ownerDid = parts[0];
          const collection = parts[1];
          const rkey = parts[2];

          if (!ownerDid || !rkey || !collection) {
            throw new Error(`Invalid community URI: ${communityUri}`);
          }

          // Fetch community config from owner's PDS
          const configUrl = `${pdsUrl}/xrpc/com.atproto.repo.getRecord?repo=${ownerDid}&collection=${collection}&rkey=${rkey}`;
          const configResponse = await fetch(configUrl);

          if (!configResponse.ok) {
            throw new Error(`Failed to fetch community config: ${configResponse.statusText}`);
          }

          const configData = (await configResponse.json()) as {
            value: {
              name: string;
              description?: string;
              stage: string;
              createdAt: string;
            };
          };

          return {
            id: rkey,
            name: configData.value.name,
            description: configData.value.description || null,
            stage: configData.value.stage,
            parentId: null, // TODO: Extract from parent relationship if exists
            memberCount: 0, // TODO: Query stats from Durable Object
            postCount: 0, // TODO: Query stats from Durable Object
            createdAt: Math.floor(new Date(configData.value.createdAt).getTime() / 1000),
          };
        } catch (_err) {
          return null;
        }
      })
    );

    // Filter out failed fetches
    const validCommunities = communities.filter((c) => c !== null);

    return c.json({ data: validCommunities });
  } catch (err) {
    return c.json(
      {
        error: 'InternalServerError',
        message: 'Failed to list communities',
        details: c.env.ENVIRONMENT === 'development' ? String(err) : undefined,
      },
      500
    );
  }
});

// ============================================================================
// POST /api/communities
// Create a new community (PDS-first architecture)
// ============================================================================

app.post('/', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const body = await c.req.json();

    const validation = await validateRequest(CreateCommunitySchema, body);
    if (!validation.success) {
      return c.json({ error: 'InvalidRequest', message: validation.error }, 400);
    }

    // Generate unique hashtag for the community with collision check
    const { ATProtoService } = await import('../services/atproto');
    const { generateFeedHashtag } = await import('@atrarium/utils/hashtag');
    const atproto = new ATProtoService(c.env);

    let hashtag: string | null = null;
    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const candidateHashtag = generateFeedHashtag();

      // Check if hashtag already exists in PDS
      try {
        const existingCommunity = await atproto.queryCommunityByHashtag(candidateHashtag);
        if (!existingCommunity) {
          // Hashtag is unique
          hashtag = candidateHashtag;
          break;
        }
      } catch (_error) {
        hashtag = candidateHashtag;
        break;
      }
    }

    if (!hashtag) {
      return c.json(
        {
          error: 'HashtagCollisionError',
          message: 'Failed to generate unique hashtag after 3 attempts',
        },
        500
      );
    }

    const now = new Date().toISOString();

    const pdsResult = await atproto.createCommunityConfig({
      $type: 'net.atrarium.group.config',
      name: validation.data.name,
      description: validation.data.description || '',
      hashtag,
      stage: 'theme',
      createdAt: now,
    });

    // Extract community ID from rkey
    const communityId = pdsResult.rkey;

    // Create Durable Object for this community (T033)
    if (!c.env.COMMUNITY_FEED) {
      throw new Error('COMMUNITY_FEED Durable Object binding not found');
    }

    const id = c.env.COMMUNITY_FEED.idFromName(communityId);
    const stub = c.env.COMMUNITY_FEED.get(id);

    // Initialize community configuration in Durable Object
    await stub.fetch(
      new Request('http://fake-host/updateConfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: validation.data.name,
          description: validation.data.description,
          hashtag,
          stage: 'theme',
          createdAt: now,
        }),
      })
    );

    // Add creator as owner member
    await stub.fetch(
      new Request('http://fake-host/addMember', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did: userDid,
          role: 'owner',
          joinedAt: now,
          active: true,
        }),
      })
    );

    const response: CommunityResponse = {
      id: communityId,
      name: validation.data.name,
      description: validation.data.description || null,
      stage: 'theme',
      parentId: null,
      memberCount: 1,
      postCount: 0,
      createdAt: Math.floor(new Date(now).getTime() / 1000),
    };

    return c.json(response, 201);
  } catch (err) {
    return c.json(
      {
        error: 'InternalServerError',
        message: 'Failed to create community',
        details: c.env.ENVIRONMENT === 'development' ? String(err) : undefined,
      },
      500
    );
  }
});

// ============================================================================
// GET /api/communities/:id
// Get community by ID (PDS-first architecture)
// ============================================================================

app.get('/:id', async (c) => {
  try {
    const communityId = c.req.param('id');
    const userDid = c.get('userDid') as string;
    const { ATProtoService } = await import('../services/atproto');
    const atproto = new ATProtoService(c.env);

    // Convert rkey to AT-URI
    // If communityId is already a full AT-URI (starts with "at://"), use it as-is
    // Otherwise, construct AT-URI from userDid and rkey
    let communityUri: string;
    if (communityId.startsWith('at://')) {
      communityUri = communityId;
    } else {
      // Construct AT-URI: at://did:plc:xxx/net.atrarium.group.config/rkey
      communityUri = `at://${userDid}/net.atrarium.group.config/${communityId}`;
    }

    // Fetch community config from PDS
    const community = await atproto.getCommunityConfig(communityUri);

    // Fetch community stats (memberCount, pendingRequestCount)
    const stats = await atproto.getCommunityStats(communityUri);

    // Extract rkey from AT-URI for response
    const rkey = communityUri.split('/').pop() || communityUri;

    return c.json({
      id: rkey, // Return rkey for URL routing consistency
      name: community.name,
      description: community.description || null,
      stage: community.stage,
      memberCount: stats.memberCount,
      postCount: 0, // TODO: Calculate from Durable Object
      createdAt: new Date(community.createdAt).getTime(),
    });
  } catch (_err) {
    return c.json({ error: 'InternalServerError', message: 'Failed to get community' }, 500);
  }
});

// ============================================================================
// PATCH /api/communities/:id
// Update community (owner only, PDS-first architecture)
// ============================================================================

app.patch('/:id', async (c) => {
  try {
    // TODO: Implement PDS-based community update
    // - Verify ownership via PDS membership records
    // - Update community config in PDS
    return c.json(
      { error: 'NotImplemented', message: 'PDS-based update not yet implemented' },
      501
    );
  } catch (_err) {
    return c.json({ error: 'InternalServerError', message: 'Failed to update community' }, 500);
  }
});

// POST /api/communities/:id/close
// Close (archive) community (owner only, PDS-first architecture)
app.post('/:id/close', async (c) => {
  try {
    // TODO: Implement PDS-based community archival
    // - Verify ownership via PDS membership records
    // - Update community config status in PDS
    return c.json(
      { error: 'NotImplemented', message: 'PDS-based archival not yet implemented' },
      501
    );
  } catch (_err) {
    return c.json({ error: 'InternalServerError', message: 'Failed to close community' }, 500);
  }
});

// ============================================================================
// POST /api/communities/:id/children
// Create child Theme group under Graduated parent (T026)
// ============================================================================

app.post('/:id/children', async (c) => {
  try {
    const parentId = c.req.param('id');
    const userDid = c.get('userDid') as string;
    const body = await c.req.json();

    // Validate input
    if (!body.name || typeof body.name !== 'string') {
      return c.json({ error: 'InvalidRequest', message: 'name is required' }, 400);
    }

    if (body.name.length > 200) {
      return c.json({ error: 'InvalidRequest', message: 'name exceeds 200 characters' }, 400);
    }

    if (body.description && typeof body.description !== 'string') {
      return c.json({ error: 'InvalidRequest', message: 'description must be a string' }, 400);
    }

    if (body.description && body.description.length > 2000) {
      return c.json(
        { error: 'InvalidRequest', message: 'description exceeds 2000 characters' },
        400
      );
    }

    const { ATProtoService } = await import('../services/atproto');
    const atproto = new ATProtoService(c.env);

    // Verify user is owner of parent group
    const parentUri = `at://${userDid}/net.atrarium.group.config/${parentId}`;
    const parentConfig = await atproto.getCommunityConfig(parentUri);

    if (!parentConfig) {
      return c.json({ error: 'NotFound', message: 'Parent group not found' }, 404);
    }

    if (parentConfig.stage !== 'graduated') {
      return c.json({ error: 'Conflict', message: 'Only Graduated groups can have children' }, 409);
    }

    // Create child group
    const childConfig = await atproto.createChildGroup(
      parentId,
      body.name,
      body.description,
      body.feedMix
    );

    // Trigger Durable Object update via RPC (add to parent's children list)
    if (!c.env.COMMUNITY_FEED) {
      throw new Error('COMMUNITY_FEED Durable Object binding not found');
    }

    const parentDOId = c.env.COMMUNITY_FEED.idFromName(parentId);
    const parentDOStub = c.env.COMMUNITY_FEED.get(parentDOId);

    await parentDOStub.fetch(
      new Request('http://fake-host/addChild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: childConfig.rkey }),
      })
    );

    // Initialize child Durable Object
    const childDOId = c.env.COMMUNITY_FEED.idFromName(childConfig.rkey);
    const childDOStub = c.env.COMMUNITY_FEED.get(childDOId);

    await childDOStub.fetch(
      new Request('http://fake-host/updateConfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: childConfig.name,
          description: childConfig.description,
          hashtag: childConfig.hashtag,
          stage: 'theme',
          parentGroup: parentUri,
          createdAt: childConfig.createdAt,
        }),
      })
    );

    return c.json(
      {
        id: childConfig.rkey,
        name: childConfig.name,
        description: childConfig.description || null,
        stage: childConfig.stage,
        parentGroup: childConfig.parentCommunity,
        hashtag: childConfig.hashtag,
        memberCount: 0,
        postCount: 0,
        createdAt: Math.floor(new Date(childConfig.createdAt).getTime() / 1000),
      },
      201
    );
  } catch (err) {
    return c.json(
      {
        error: 'InternalServerError',
        message: 'Failed to create child group',
        details: c.env.ENVIRONMENT === 'development' ? String(err) : undefined,
      },
      500
    );
  }
});

// ============================================================================
// POST /api/communities/:id/upgrade
// Upgrade group stage (T027)
// ============================================================================

app.post('/:id/upgrade', async (c) => {
  try {
    const groupId = c.req.param('id');
    const userDid = c.get('userDid') as string;
    const body = await c.req.json();

    // Validate input
    if (!body.targetStage || !['community', 'graduated'].includes(body.targetStage)) {
      return c.json(
        { error: 'InvalidRequest', message: 'targetStage must be "community" or "graduated"' },
        400
      );
    }

    const { ATProtoService } = await import('../services/atproto');
    const atproto = new ATProtoService(c.env);

    // Verify user is owner
    const groupUri = `at://${userDid}/net.atrarium.group.config/${groupId}`;
    const memberships = await atproto.listMemberships(userDid, { communityUri: groupUri });
    const ownerMembership = memberships.find((m) => m.role === 'owner');

    if (!ownerMembership) {
      return c.json({ error: 'Forbidden', message: 'Only owner can upgrade stage' }, 403);
    }

    // Upgrade stage
    try {
      const updatedConfig = await atproto.upgradeGroupStage(groupId, body.targetStage);

      // Update Durable Object
      if (!c.env.COMMUNITY_FEED) {
        throw new Error('COMMUNITY_FEED Durable Object binding not found');
      }

      const doId = c.env.COMMUNITY_FEED.idFromName(groupId);
      const doStub = c.env.COMMUNITY_FEED.get(doId);

      await doStub.fetch(
        new Request('http://fake-host/updateConfig', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stage: updatedConfig.stage,
            updatedAt: updatedConfig.updatedAt,
          }),
        })
      );

      return c.json({
        id: groupId,
        name: updatedConfig.name,
        description: updatedConfig.description || null,
        stage: updatedConfig.stage,
        parentGroup: updatedConfig.parentCommunity,
        memberCount: await atproto.getMemberCount(groupId),
        postCount: 0,
        updatedAt: Math.floor(new Date(updatedConfig.updatedAt || Date.now()).getTime() / 1000),
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes('threshold')) {
        return c.json({ error: 'Conflict', message: err.message }, 409);
      }
      throw err;
    }
  } catch (err) {
    return c.json(
      {
        error: 'InternalServerError',
        message: 'Failed to upgrade stage',
        details: c.env.ENVIRONMENT === 'development' ? String(err) : undefined,
      },
      500
    );
  }
});

// ============================================================================
// POST /api/communities/:id/downgrade
// Downgrade group stage (T028)
// ============================================================================

app.post('/:id/downgrade', async (c) => {
  try {
    const groupId = c.req.param('id');
    const userDid = c.get('userDid') as string;
    const body = await c.req.json();

    // Validate input
    if (!body.targetStage || !['theme', 'community'].includes(body.targetStage)) {
      return c.json(
        { error: 'InvalidRequest', message: 'targetStage must be "theme" or "community"' },
        400
      );
    }

    const { ATProtoService } = await import('../services/atproto');
    const atproto = new ATProtoService(c.env);

    // Verify user is owner
    const groupUri = `at://${userDid}/net.atrarium.group.config/${groupId}`;
    const memberships = await atproto.listMemberships(userDid, { communityUri: groupUri });
    const ownerMembership = memberships.find((m) => m.role === 'owner');

    if (!ownerMembership) {
      return c.json({ error: 'Forbidden', message: 'Only owner can downgrade stage' }, 403);
    }

    // Downgrade stage
    const updatedConfig = await atproto.downgradeGroupStage(groupId, body.targetStage);

    // Update Durable Object
    if (!c.env.COMMUNITY_FEED) {
      throw new Error('COMMUNITY_FEED Durable Object binding not found');
    }

    const doId = c.env.COMMUNITY_FEED.idFromName(groupId);
    const doStub = c.env.COMMUNITY_FEED.get(doId);

    await doStub.fetch(
      new Request('http://fake-host/updateConfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: updatedConfig.stage,
          updatedAt: updatedConfig.updatedAt,
        }),
      })
    );

    return c.json({
      id: groupId,
      name: updatedConfig.name,
      description: updatedConfig.description || null,
      stage: updatedConfig.stage,
      parentGroup: updatedConfig.parentCommunity,
      memberCount: await atproto.getMemberCount(groupId),
      postCount: 0,
      updatedAt: Math.floor(new Date(updatedConfig.updatedAt || Date.now()).getTime() / 1000),
    });
  } catch (err) {
    return c.json(
      {
        error: 'InternalServerError',
        message: 'Failed to downgrade stage',
        details: c.env.ENVIRONMENT === 'development' ? String(err) : undefined,
      },
      500
    );
  }
});

// ============================================================================
// GET /api/communities/:id/children
// List child groups (T029)
// ============================================================================

app.get('/:id/children', async (c) => {
  try {
    const parentId = c.req.param('id');
    const limit = Number.parseInt(c.req.query('limit') || '50', 10);
    const cursor = c.req.query('cursor');

    const { ATProtoService } = await import('../services/atproto');
    const atproto = new ATProtoService(c.env);

    // List children
    const result = await atproto.listChildGroups(parentId, limit, cursor);

    // Transform to response format
    const children = await Promise.all(
      result.children.map(async (child) => {
        const memberCount = await atproto.getMemberCount(child.hashtag.replace('#atr_', ''));
        return {
          id: child.hashtag.replace('#atr_', ''),
          name: child.name,
          description: child.description || null,
          stage: child.stage,
          parentGroup: child.parentCommunity,
          hashtag: child.hashtag,
          memberCount,
          postCount: 0,
          createdAt: Math.floor(new Date(child.createdAt).getTime() / 1000),
        };
      })
    );

    return c.json({ children, cursor: result.cursor });
  } catch (err) {
    return c.json(
      {
        error: 'InternalServerError',
        message: 'Failed to list children',
        details: c.env.ENVIRONMENT === 'development' ? String(err) : undefined,
      },
      500
    );
  }
});

// ============================================================================
// GET /api/communities/:id/parent
// Get parent group (T030)
// ============================================================================

app.get('/:id/parent', async (c) => {
  try {
    const childId = c.req.param('id');

    const { ATProtoService } = await import('../services/atproto');
    const atproto = new ATProtoService(c.env);

    // Get parent
    const parentConfig = await atproto.getParentGroup(childId);

    if (!parentConfig) {
      return c.json(null);
    }

    const memberCount = await atproto.getMemberCount(parentConfig.hashtag.replace('#atr_', ''));

    return c.json({
      id: parentConfig.hashtag.replace('#atr_', ''),
      name: parentConfig.name,
      description: parentConfig.description || null,
      stage: parentConfig.stage,
      hashtag: parentConfig.hashtag,
      memberCount,
      postCount: 0,
      createdAt: Math.floor(new Date(parentConfig.createdAt).getTime() / 1000),
    });
  } catch (err) {
    return c.json(
      {
        error: 'InternalServerError',
        message: 'Failed to get parent',
        details: c.env.ENVIRONMENT === 'development' ? String(err) : undefined,
      },
      500
    );
  }
});

// ============================================================================
// DELETE /api/communities/:id
// Delete group with children validation (T031)
// ============================================================================

app.delete('/:id', async (c) => {
  try {
    const groupId = c.req.param('id');
    const userDid = c.get('userDid') as string;

    const { ATProtoService } = await import('../services/atproto');
    const atproto = new ATProtoService(c.env);

    // Verify user is owner
    const groupUri = `at://${userDid}/net.atrarium.group.config/${groupId}`;
    const memberships = await atproto.listMemberships(userDid, { communityUri: groupUri });
    const ownerMembership = memberships.find((m) => m.role === 'owner');

    if (!ownerMembership) {
      return c.json({ error: 'Forbidden', message: 'Only owner can delete group' }, 403);
    }

    // Check for children
    const childrenResult = await atproto.listChildGroups(groupId);

    if (childrenResult.children.length > 0) {
      const childNames = childrenResult.children.map((c) => c.name).join(', ');
      return c.json(
        {
          error: 'Conflict',
          message: `Cannot delete group with ${childrenResult.children.length} active children. Delete children first: ${childNames}`,
        },
        409
      );
    }

    // Delete group (using com.atproto.repo.deleteRecord)
    const agent = await atproto.getAgent();
    await agent.com.atproto.repo.deleteRecord({
      repo: userDid,
      collection: 'net.atrarium.group.config',
      rkey: groupId,
    });

    // Delete Durable Object data
    if (!c.env.COMMUNITY_FEED) {
      throw new Error('COMMUNITY_FEED Durable Object binding not found');
    }

    const doId = c.env.COMMUNITY_FEED.idFromName(groupId);
    const doStub = c.env.COMMUNITY_FEED.get(doId);

    await doStub.fetch(
      new Request('http://fake-host/delete', {
        method: 'DELETE',
      })
    );

    return c.json({ success: true, deletedId: groupId });
  } catch (err) {
    return c.json(
      {
        error: 'InternalServerError',
        message: 'Failed to delete group',
        details: c.env.ENVIRONMENT === 'development' ? String(err) : undefined,
      },
      500
    );
  }
});

export default app;
