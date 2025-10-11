// Atrarium MVP - Memberships Routes
// Membership management API (T029-T038)

import { Hono } from 'hono';
import { ATProtoService } from '../services/atproto';
import { AuthService } from '../services/auth';
import type { Env, HonoVariables } from '../types';

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// ============================================================================
// Middleware: JWT Authentication
// ============================================================================

app.use('*', async (c, next) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const authService = new AuthService(c.env);
    const userDid = await authService.extractUserFromHeader(authHeader);
    c.set('userDid', userDid);
    await next();
  } catch (_err) {
    return c.json({ error: 'Unauthorized', message: 'Invalid or missing JWT' }, 401);
  }
});

// ============================================================================
// POST /api/memberships
// Join community (T029)
// ============================================================================

app.post('/', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const body = await c.req.json();
    const { communityId, accessType } = body;

    if (!communityId || !accessType) {
      return c.json(
        { error: 'InvalidRequest', message: 'communityId and accessType are required' },
        400
      );
    }

    if (accessType !== 'open' && accessType !== 'invite-only') {
      return c.json(
        { error: 'InvalidRequest', message: 'accessType must be "open" or "invite-only"' },
        400
      );
    }

    const atproto = new ATProtoService(c.env);

    // Check for duplicate membership (FR-030)
    const communityUri = `at://did:plc:system/net.atrarium.group.config/${communityId}`;
    const existingMemberships = await atproto.listMemberships(userDid, { communityUri });

    if (existingMemberships.length > 0) {
      return c.json(
        { error: 'AlreadyMember', message: 'User is already a member of this community' },
        409
      );
    }

    // Create membership record with appropriate status
    const status = accessType === 'open' ? 'active' : 'pending';
    const now = new Date().toISOString();

    const membershipResult = await atproto.createMembershipRecord(
      {
        $type: 'net.atrarium.group.membership',
        community: communityUri,
        role: 'member',
        status,
        joinedAt: now,
        active: status === 'active',
      },
      userDid
    );

    // If open community, add member to Durable Object immediately
    if (status === 'active') {
      const id = c.env.COMMUNITY_FEED.idFromName(communityId);
      const stub = c.env.COMMUNITY_FEED.get(id);

      await stub.fetch(
        new Request('http://fake-host/addMember', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            did: userDid,
            role: 'member',
            joinedAt: now,
            active: true,
          }),
        })
      );
    }

    return c.json(
      {
        membershipUri: membershipResult.uri,
        communityId,
        userDid,
        role: 'member',
        status,
        joinedAt: now,
      },
      201
    );
  } catch (err) {
    return c.json({ error: 'InternalServerError', message: (err as Error).message }, 500);
  }
});

// ============================================================================
// DELETE /api/memberships/:communityId
// Leave community (T030)
// ============================================================================

app.delete('/:communityId', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const communityId = c.req.param('communityId');

    const atproto = new ATProtoService(c.env);

    // Get user's membership
    const communityUri = `at://did:plc:system/net.atrarium.group.config/${communityId}`;
    const memberships = await atproto.listMemberships(userDid, {
      communityUri,
      activeOnly: true,
    });

    if (memberships.length === 0) {
      return c.json({ error: 'NotMember', message: 'User is not a member of this community' }, 404);
    }

    // Safe: memberships.length > 0 is guaranteed by the check above
    // biome-ignore lint/style/noNonNullAssertion: Array length checked above
    const membership = memberships[0]!;

    // Prevent owner from leaving (must transfer ownership first)
    if (membership.role === 'owner') {
      return c.json(
        {
          error: 'OwnerCannotLeave',
          message: 'Owner must transfer ownership before leaving',
        },
        403
      );
    }

    // Deactivate membership in PDS
    await atproto.deleteMembershipRecord(membership.uri as string);

    // Remove from Durable Object
    const id = c.env.COMMUNITY_FEED.idFromName(communityId);
    const stub = c.env.COMMUNITY_FEED.get(id);

    await stub.fetch(
      new Request('http://fake-host/removeMember', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did: userDid }),
      })
    );

    return c.json({ success: true, message: 'Successfully left community' }, 200);
  } catch (err) {
    return c.json({ error: 'InternalServerError', message: (err as Error).message }, 500);
  }
});

// ============================================================================
// GET /api/memberships/my
// List user's memberships (T031)
// ============================================================================

app.get('/my', async (c) => {
  try {
    const userDid = c.get('userDid') as string;

    const atproto = new ATProtoService(c.env);

    // Get all memberships (active and pending)
    const memberships = await atproto.listMemberships(userDid, { status: 'all' });

    return c.json({
      memberships: memberships.map((m) => ({
        uri: m.uri,
        community: m.community,
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt,
        active: m.active,
      })),
    });
  } catch (err) {
    return c.json({ error: 'InternalServerError', message: (err as Error).message }, 500);
  }
});

// ============================================================================
// GET /api/memberships/:communityId/members
// List community members (T032 - admin only)
// ============================================================================

app.get('/:communityId/members', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const communityId = c.req.param('communityId');

    const atproto = new ATProtoService(c.env);

    // Get community config to extract owner DID
    const communityUri = `at://did:plc:system/net.atrarium.group.config/${communityId}`;
    // Community config exists check (can throw if community not found)
    await atproto.getCommunityConfig(communityUri);

    // Extract owner DID from community URI (AT-URI format: at://did:plc:xxx/collection/rkey)
    const ownerDid = communityUri.split('/')[2] as string;

    // Check if requester is admin (owner or moderator)
    const requesterMemberships = await atproto.listMemberships(userDid, {
      communityUri,
      activeOnly: true,
    });

    if (requesterMemberships.length === 0) {
      return c.json({ error: 'Forbidden', message: 'User is not a member' }, 403);
    }

    const requesterRole = requesterMemberships[0]?.role;
    if (requesterRole !== 'owner' && requesterRole !== 'moderator') {
      return c.json({ error: 'Forbidden', message: 'Admin access required' }, 403);
    }

    // List all members from owner's PDS
    // NOTE: In production, would need to query all members' PDSs or use indexer
    // For MVP, query owner's PDS which should have membership records
    const allMemberships = await atproto.listMemberships(ownerDid, {
      communityUri,
      status: 'active',
      activeOnly: true,
    });

    return c.json({
      members: allMemberships.map((m) => ({
        did: m.community.split('/')[2], // Extract DID from community URI
        role: m.role,
        joinedAt: m.joinedAt,
        active: m.active,
      })),
    });
  } catch (err) {
    return c.json({ error: 'InternalServerError', message: (err as Error).message }, 500);
  }
});

// ============================================================================
// PATCH /api/memberships/:communityId/:did/role
// Change member role (T033 - owner only)
// ============================================================================

app.patch('/:communityId/:did/role', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const communityId = c.req.param('communityId');
    const targetDid = c.req.param('did');
    const body = await c.req.json();
    const { newRole } = body;

    if (!newRole || !['owner', 'moderator', 'member'].includes(newRole)) {
      return c.json(
        {
          error: 'InvalidRequest',
          message: 'newRole must be "owner", "moderator", or "member"',
        },
        400
      );
    }

    const atproto = new ATProtoService(c.env);

    const communityUri = `at://did:plc:system/net.atrarium.group.config/${communityId}`;

    // Check if requester is owner
    const requesterMemberships = await atproto.listMemberships(userDid, {
      communityUri,
      activeOnly: true,
    });

    if (requesterMemberships.length === 0 || requesterMemberships[0]?.role !== 'owner') {
      return c.json({ error: 'Forbidden', message: 'Owner access required' }, 403);
    }

    // Get target member's membership
    const targetMemberships = await atproto.listMemberships(targetDid, {
      communityUri,
      activeOnly: true,
    });

    if (targetMemberships.length === 0) {
      return c.json({ error: 'NotFound', message: 'Target user is not a member' }, 404);
    }

    // Safe: targetMemberships.length > 0 is guaranteed by previous check
    // biome-ignore lint/style/noNonNullAssertion: Array length checked above
    const targetMembership = targetMemberships[0]!;

    // Prevent changing owner role (use transfer ownership instead)
    if (newRole === 'owner') {
      return c.json(
        {
          error: 'InvalidRequest',
          message: 'Use transfer ownership endpoint to change owner',
        },
        400
      );
    }

    // Update membership role in PDS
    await atproto.updateMembershipRecord(targetMembership.uri as string, { role: newRole });

    // Update role in Durable Object
    const id = c.env.COMMUNITY_FEED.idFromName(communityId);
    const stub = c.env.COMMUNITY_FEED.get(id);

    await stub.fetch(
      new Request('http://fake-host/updateMemberRole', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did: targetDid,
          newRole,
        }),
      })
    );

    return c.json({
      success: true,
      message: `Role changed to ${newRole}`,
      did: targetDid,
      newRole,
    });
  } catch (err) {
    return c.json({ error: 'InternalServerError', message: (err as Error).message }, 500);
  }
});

// ============================================================================
// DELETE /api/memberships/:communityId/:did
// Remove member (T034 - admin only)
// ============================================================================

app.delete('/:communityId/:did', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const communityId = c.req.param('communityId');
    const targetDid = c.req.param('did');

    const atproto = new ATProtoService(c.env);

    const communityUri = `at://did:plc:system/net.atrarium.group.config/${communityId}`;

    // Check if requester is admin
    const requesterMemberships = await atproto.listMemberships(userDid, {
      communityUri,
      activeOnly: true,
    });

    if (requesterMemberships.length === 0) {
      return c.json({ error: 'Forbidden', message: 'User is not a member' }, 403);
    }

    const requesterRole = requesterMemberships[0]?.role;
    if (requesterRole !== 'owner' && requesterRole !== 'moderator') {
      return c.json({ error: 'Forbidden', message: 'Admin access required' }, 403);
    }

    // Get target member's membership
    const targetMemberships = await atproto.listMemberships(targetDid, {
      communityUri,
      activeOnly: true,
    });

    if (targetMemberships.length === 0) {
      return c.json({ error: 'NotFound', message: 'Target user is not a member' }, 404);
    }

    // Safe: targetMemberships.length > 0 is guaranteed by previous check
    // biome-ignore lint/style/noNonNullAssertion: Array length checked above
    const targetMembership = targetMemberships[0]!;

    // Prevent removing owner
    if (targetMembership.role === 'owner') {
      return c.json(
        {
          error: 'CannotRemoveOwner',
          message: 'Cannot remove community owner',
        },
        403
      );
    }

    // Moderators can only remove regular members (FR-024)
    if (requesterRole === 'moderator' && targetMembership.role === 'moderator') {
      return c.json(
        {
          error: 'Forbidden',
          message: 'Moderators cannot remove other moderators',
        },
        403
      );
    }

    // Deactivate membership in PDS
    await atproto.deleteMembershipRecord(targetMembership.uri as string);

    // Remove from Durable Object
    const id = c.env.COMMUNITY_FEED.idFromName(communityId);
    const stub = c.env.COMMUNITY_FEED.get(id);

    await stub.fetch(
      new Request('http://fake-host/removeMember', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did: targetDid }),
      })
    );

    return c.json({
      success: true,
      message: 'Member removed successfully',
      did: targetDid,
    });
  } catch (err) {
    return c.json({ error: 'InternalServerError', message: (err as Error).message }, 500);
  }
});

// ============================================================================
// POST /api/memberships/:communityId/transfer
// Transfer ownership (T035 - owner only)
// ============================================================================

app.post('/:communityId/transfer', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const communityId = c.req.param('communityId');
    const body = await c.req.json();
    const { newOwnerDid } = body;

    if (!newOwnerDid) {
      return c.json({ error: 'InvalidRequest', message: 'newOwnerDid is required' }, 400);
    }

    const atproto = new ATProtoService(c.env);

    const communityUri = `at://did:plc:system/net.atrarium.group.config/${communityId}`;

    // Check if requester is owner
    const requesterMemberships = await atproto.listMemberships(userDid, {
      communityUri,
      activeOnly: true,
    });

    if (requesterMemberships.length === 0 || requesterMemberships[0]?.role !== 'owner') {
      return c.json({ error: 'Forbidden', message: 'Owner access required' }, 403);
    }

    // Check if new owner is an existing member
    const newOwnerMemberships = await atproto.listMemberships(newOwnerDid, {
      communityUri,
      activeOnly: true,
    });

    if (newOwnerMemberships.length === 0) {
      return c.json(
        {
          error: 'InvalidRequest',
          message: 'New owner must be an existing member',
        },
        400
      );
    }

    const oldOwnerMembershipUri = requesterMemberships[0]?.uri;
    const newOwnerMembershipUri = newOwnerMemberships[0]?.uri;

    if (!oldOwnerMembershipUri || !newOwnerMembershipUri) {
      return c.json({ error: 'Membership URIs not found' }, 404);
    }

    // Transfer ownership in PDS
    await atproto.transferOwnership(oldOwnerMembershipUri, newOwnerMembershipUri);

    // Update roles in Durable Object
    const id = c.env.COMMUNITY_FEED.idFromName(communityId);
    const stub = c.env.COMMUNITY_FEED.get(id);

    await stub.fetch(
      new Request('http://fake-host/updateMemberRole', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did: userDid,
          newRole: 'member',
        }),
      })
    );

    await stub.fetch(
      new Request('http://fake-host/updateMemberRole', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did: newOwnerDid,
          newRole: 'owner',
        }),
      })
    );

    return c.json({
      success: true,
      message: 'Ownership transferred successfully',
      oldOwner: userDid,
      newOwner: newOwnerDid,
    });
  } catch (err) {
    return c.json({ error: 'InternalServerError', message: (err as Error).message }, 500);
  }
});

// ============================================================================
// GET /api/join-requests/:communityId
// List pending join requests (T036 - admin only)
// ============================================================================

app.get('/join-requests/:communityId', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const communityId = c.req.param('communityId');

    const atproto = new ATProtoService(c.env);

    const communityUri = `at://did:plc:system/net.atrarium.group.config/${communityId}`;

    // Check if requester is admin
    const requesterMemberships = await atproto.listMemberships(userDid, {
      communityUri,
      activeOnly: true,
    });

    if (requesterMemberships.length === 0) {
      return c.json({ error: 'Forbidden', message: 'User is not a member' }, 403);
    }

    const requesterRole = requesterMemberships[0]?.role;
    if (requesterRole !== 'owner' && requesterRole !== 'moderator') {
      return c.json({ error: 'Forbidden', message: 'Admin access required' }, 403);
    }

    // Extract owner DID from community URI (AT-URI format: at://did:plc:xxx/collection/rkey)
    const ownerDid = communityUri.split('/')[2] as string;

    // List pending join requests (status='pending')
    const pendingRequests = await atproto.listMemberships(ownerDid, {
      communityUri,
      status: 'pending',
    });

    return c.json({
      requests: pendingRequests.map((r) => ({
        uri: r.uri,
        did: r.community.split('/')[2], // Extract requester DID
        requestedAt: r.joinedAt,
      })),
    });
  } catch (err) {
    return c.json({ error: 'InternalServerError', message: (err as Error).message }, 500);
  }
});

// ============================================================================
// POST /api/join-requests/:communityId/:did/approve
// Approve join request (T037 - admin only)
// ============================================================================

app.post('/join-requests/:communityId/:did/approve', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const communityId = c.req.param('communityId');
    const requesterDid = c.req.param('did');

    const atproto = new ATProtoService(c.env);

    const communityUri = `at://did:plc:system/net.atrarium.group.config/${communityId}`;

    // Check if approver is admin
    const approverMemberships = await atproto.listMemberships(userDid, {
      communityUri,
      activeOnly: true,
    });

    if (approverMemberships.length === 0) {
      return c.json({ error: 'Forbidden', message: 'User is not a member' }, 403);
    }

    const approverRole = approverMemberships[0]?.role;
    if (approverRole !== 'owner' && approverRole !== 'moderator') {
      return c.json({ error: 'Forbidden', message: 'Admin access required' }, 403);
    }

    // Get pending join request
    const pendingMemberships = await atproto.listMemberships(requesterDid, {
      communityUri,
      status: 'pending',
    });

    if (pendingMemberships.length === 0) {
      return c.json({ error: 'NotFound', message: 'No pending join request found' }, 404);
    }

    // Safe: pendingMemberships.length > 0 is guaranteed by previous check
    // biome-ignore lint/style/noNonNullAssertion: Array length checked above
    const pendingMembership = pendingMemberships[0]!;

    // Change status from 'pending' to 'active'
    await atproto.updateMembershipRecord(pendingMembership.uri as string, {
      status: 'active',
    });

    // Add member to Durable Object
    const id = c.env.COMMUNITY_FEED.idFromName(communityId);
    const stub = c.env.COMMUNITY_FEED.get(id);

    await stub.fetch(
      new Request('http://fake-host/addMember', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did: requesterDid,
          role: 'member',
          joinedAt: pendingMembership.joinedAt,
          active: true,
        }),
      })
    );

    return c.json({
      success: true,
      message: 'Join request approved',
      did: requesterDid,
    });
  } catch (err) {
    return c.json({ error: 'InternalServerError', message: (err as Error).message }, 500);
  }
});

// ============================================================================
// POST /api/join-requests/:communityId/:did/reject
// Reject join request (T038 - admin only)
// ============================================================================

app.post('/join-requests/:communityId/:did/reject', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const communityId = c.req.param('communityId');
    const requesterDid = c.req.param('did');

    const atproto = new ATProtoService(c.env);

    const communityUri = `at://did:plc:system/net.atrarium.group.config/${communityId}`;

    // Check if rejector is admin
    const rejectorMemberships = await atproto.listMemberships(userDid, {
      communityUri,
      activeOnly: true,
    });

    if (rejectorMemberships.length === 0) {
      return c.json({ error: 'Forbidden', message: 'User is not a member' }, 403);
    }

    const rejectorRole = rejectorMemberships[0]?.role;
    if (rejectorRole !== 'owner' && rejectorRole !== 'moderator') {
      return c.json({ error: 'Forbidden', message: 'Admin access required' }, 403);
    }

    // Get pending join request
    const pendingMemberships = await atproto.listMemberships(requesterDid, {
      communityUri,
      status: 'pending',
    });

    if (pendingMemberships.length === 0) {
      return c.json({ error: 'NotFound', message: 'No pending join request found' }, 404);
    }

    // Safe: pendingMemberships.length > 0 is guaranteed by previous check
    // biome-ignore lint/style/noNonNullAssertion: Array length checked above
    const pendingMembership = pendingMemberships[0]!;

    // Delete membership record (reject join request)
    await atproto.deleteMembershipRecord(pendingMembership.uri);

    return c.json({
      success: true,
      message: 'Join request rejected',
      did: requesterDid,
    });
  } catch (err) {
    return c.json({ error: 'InternalServerError', message: (err as Error).message }, 500);
  }
});

export default app;
