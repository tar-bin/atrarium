// Atrarium MVP - Communities Routes
// Community management API

import { Hono } from 'hono';
import type { Env, CommunityResponse, HonoVariables } from '../types';
import { AuthService } from '../services/auth';
import { CommunityModel } from '../models/community';
import { MembershipModel } from '../models/membership';
import { validateRequest, CreateCommunitySchema, UpdateCommunitySchema } from '../schemas/validation';

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
  } catch (err) {
    return c.json({ error: 'Unauthorized', message: 'Invalid or missing JWT' }, 401);
  }
});

// ============================================================================
// GET /api/communities
// List communities where user is a member
// ============================================================================

app.get('/', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const communityModel = new CommunityModel(c.env);

    const communities = await communityModel.listByUser(userDid);

    const response = communities.map((community): CommunityResponse => ({
      id: community.id,
      name: community.name,
      description: community.description,
      stage: community.stage,
      parentId: community.parentId,
      memberCount: community.memberCount,
      postCount: community.postCount,
      createdAt: community.createdAt,
    }));

    return c.json({ data: response });
  } catch (err) {
    console.error('[GET /api/communities] Error:', err);
    return c.json({ error: 'InternalServerError', message: 'Failed to list communities' }, 500);
  }
});

// ============================================================================
// POST /api/communities
// Create a new community
// ============================================================================

app.post('/', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const body = await c.req.json();

    const validation = await validateRequest(CreateCommunitySchema, body);
    if (!validation.success) {
      return c.json({ error: 'InvalidRequest', message: validation.error }, 400);
    }

    const communityModel = new CommunityModel(c.env);
    const community = await communityModel.create(validation.data, userDid);

    const response: CommunityResponse = {
      id: community.id,
      name: community.name,
      description: community.description,
      stage: community.stage,
      parentId: community.parentId,
      memberCount: community.memberCount,
      postCount: community.postCount,
      createdAt: community.createdAt,
    };

    return c.json(response, 201);
  } catch (err) {
    console.error('[POST /api/communities] Error:', err);
    return c.json({ error: 'InternalServerError', message: 'Failed to create community' }, 500);
  }
});

// ============================================================================
// GET /api/communities/:id
// Get community by ID
// ============================================================================

app.get('/:id', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const communityId = c.req.param('id');

    // Check if user is a member
    const membershipModel = new MembershipModel(c.env);
    const membership = await membershipModel.getByUserAndCommunity(communityId, userDid);

    if (!membership) {
      return c.json({ error: 'Forbidden', message: 'Not a member of this community' }, 403);
    }

    const communityModel = new CommunityModel(c.env);
    const community = await communityModel.getById(communityId);

    if (!community) {
      return c.json({ error: 'NotFound', message: 'Community not found' }, 404);
    }

    const response: CommunityResponse = {
      id: community.id,
      name: community.name,
      description: community.description,
      stage: community.stage,
      parentId: community.parentId,
      memberCount: community.memberCount,
      postCount: community.postCount,
      createdAt: community.createdAt,
    };

    return c.json(response);
  } catch (err) {
    console.error('[GET /api/communities/:id] Error:', err);
    return c.json({ error: 'InternalServerError', message: 'Failed to get community' }, 500);
  }
});

// ============================================================================
// PATCH /api/communities/:id
// Update community (owner only)
// ============================================================================

app.patch('/:id', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const communityId = c.req.param('id');

    // Check if user is owner
    const membershipModel = new MembershipModel(c.env);
    const isOwner = await membershipModel.hasRole(communityId, userDid, 'owner');

    if (!isOwner) {
      return c.json({ error: 'Forbidden', message: 'Only owner can update community' }, 403);
    }

    const body = await c.req.json();
    const validation = await validateRequest(UpdateCommunitySchema, body);

    if (!validation.success) {
      return c.json({ error: 'InvalidRequest', message: validation.error }, 400);
    }

    const communityModel = new CommunityModel(c.env);
    await communityModel.update(communityId, validation.data);

    return c.json({ success: true });
  } catch (err) {
    console.error('[PATCH /api/communities/:id] Error:', err);
    return c.json({ error: 'InternalServerError', message: 'Failed to update community' }, 500);
  }
});

export default app;
