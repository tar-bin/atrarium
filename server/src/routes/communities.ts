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
    const membershipsUrl = `${pdsUrl}/xrpc/com.atproto.repo.listRecords?repo=${userDid}&collection=net.atrarium.community.membership&limit=100`;
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

          // Parse community URI: at://did:plc:xxx/net.atrarium.community.config/rkey
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
        } catch (err) {
          console.error('[Communities] Failed to fetch community config:', err);
          return null;
        }
      })
    );

    // Filter out failed fetches
    const validCommunities = communities.filter((c) => c !== null);

    return c.json({ data: validCommunities });
  } catch (err) {
    console.error('[Communities] List communities error:', err);
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
    const { generateFeedHashtag } = await import('../utils/hashtag');
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
      $type: 'net.atrarium.community.config',
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
    console.error('[Communities] Create community error:', err);
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
    // const communityId = c.req.param('id');

    // TODO: Implement PDS-based community retrieval
    // - Fetch community config from PDS
    // - Query Durable Object for stats
    return c.json(
      { error: 'NotImplemented', message: 'PDS-based retrieval not yet implemented' },
      501
    );
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

export default app;
