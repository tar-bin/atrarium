// Emoji Management API Routes (T024-T030)
// Handles emoji upload, approval, and registry operations

import { Hono } from 'hono';
import type { Env } from '../types';
import { validateEmoji } from '../utils/emoji-validator';

const emoji = new Hono<{ Bindings: Env }>();

// T024: POST /api/emoji/upload
emoji.post('/upload', async (c) => {
  try {
    // TODO: Extract user DID from JWT token
    const userDid = c.req.header('Authorization')?.replace('Bearer ', '') || '';

    const formData = await c.req.formData();
    const fileEntry = formData.get('file');
    const shortcode = formData.get('shortcode') as string;

    if (!fileEntry || typeof fileEntry === 'string' || !shortcode) {
      return c.json({ error: 'Missing file or shortcode' }, 400);
    }

    const file = fileEntry as File;

    // Validate shortcode format
    if (!/^[a-z0-9_]{2,32}$/.test(shortcode)) {
      return c.json(
        {
          error:
            'Invalid shortcode format (must be lowercase alphanumeric + underscore, 2-32 chars)',
        },
        400
      );
    }

    // Validate file using emoji-validator utility
    const validationResult = await validateEmoji({
      mimeType: file.type,
      sizeBytes: file.size,
      shortcode,
      // Dimensions should be extracted client-side or via image decoding
      // For now, we validate type and size only
    });

    if (!validationResult.valid) {
      return c.json({ error: validationResult.error }, 400);
    }

    // T007-T008: Upload to PDS
    // TODO: Get actual AtpAgent from session
    // const atprotoService = new ATProtoService(c.env.PDS_URL || 'https://bsky.social');
    // const agent = await atprotoService.getAgent(userDid);
    // const blobRef = await atprotoService.uploadEmojiBlob(agent, blob);
    // const emojiRecord = await atprotoService.createCustomEmoji(
    //   agent, shortcode, blobRef, format, blob.size, mockDimensions, false
    // );

    // Mock response for now
    const mockBlobRef = {
      $type: 'blob' as const,
      ref: { $link: 'bafyreigbtj4x7ip5legnfznufuopl4sg4knzc2cof6duas4b3q2fy6swua' },
      mimeType: file.type,
      size: file.size,
    };

    const mockEmojiURI = `at://${userDid}/net.atrarium.emoji.custom/${Date.now()}`;

    return c.json({
      emojiURI: mockEmojiURI,
      blob: mockBlobRef,
    });
  } catch (error) {
    return c.json({ error: String(error) }, 400);
  }
});

// T025: GET /api/emoji/list
emoji.get('/list', async (c) => {
  try {
    const did = c.req.query('did');

    if (!did) {
      return c.json({ error: 'Missing DID parameter' }, 400);
    }

    // T010: List user emoji from PDS
    // const atprotoService = new ATProtoService();
    // const agent = await atprotoService.getAgent(did);
    // const emojiList = await atprotoService.listUserEmoji(agent, did);

    // Mock response
    return c.json({
      emoji: [],
    });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// T026: POST /api/communities/:id/emoji/submit
emoji.post('/communities/:id/submit', async (c) => {
  try {
    const communityId = c.req.param('id');
    const { emojiURI } = await c.req.json();

    if (!/^[0-9a-f]{8}$/.test(communityId)) {
      return c.json({ error: 'Invalid community ID format' }, 400);
    }

    if (!emojiURI) {
      return c.json({ error: 'Missing emojiURI' }, 400);
    }

    // T009: Create pending approval record
    // const atprotoService = new ATProtoService();
    // const agent = await atprotoService.getAgent(ownerDid);
    // await atprotoService.createEmojiApproval(
    //   agent, shortcode, emojiURI, communityId, 'pending'
    // );

    return c.json({
      submissionId: `${communityId}:${Date.now()}`,
      status: 'pending' as const,
    });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// T027: GET /api/communities/:id/emoji/pending
emoji.get('/communities/:id/pending', async (c) => {
  try {
    const communityId = c.req.param('id');

    if (!/^[0-9a-f]{8}$/.test(communityId)) {
      return c.json({ error: 'Invalid community ID format' }, 400);
    }

    // TODO: Check owner/moderator role

    // T011: List pending approvals
    // const atprotoService = new ATProtoService();
    // const approvals = await atprotoService.listCommunityApprovals(agent, communityId, 'pending');

    return c.json({
      submissions: [],
    });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// T028: POST /api/communities/:id/emoji/approve
emoji.post('/communities/:id/approve', async (c) => {
  try {
    const communityId = c.req.param('id');
    const { emojiURI: _emojiURI, approve } = await c.req.json();

    if (!/^[0-9a-f]{8}$/.test(communityId)) {
      return c.json({ error: 'Invalid community ID format' }, 400);
    }

    // TODO: Check owner/moderator role
    // TODO: Extract shortcode from emojiURI

    const status = approve ? 'approved' : 'rejected';
    // const _mockShortcode = 'mock_'; // Extract from emojiURI - TODO: Implement extraction

    // T009: Create approval record
    // const atprotoService = new ATProtoService();
    // const approvalRecord = await atprotoService.createEmojiApproval(
    //   agent, shortcode, emojiURI, communityId, status, reason
    // );

    // T021: Invalidate cache
    const doId = c.env.COMMUNITY_FEED.idFromName(communityId);
    const doStub = c.env.COMMUNITY_FEED.get(doId);

    await doStub.fetch(
      new Request('http://internal/rpc', {
        method: 'POST',
        body: JSON.stringify({
          method: 'invalidateEmojiCache',
          params: { communityId },
        }),
      })
    );

    return c.json({
      approvalURI: `at://mock/net.atrarium.emoji.approval/${Date.now()}`,
      status: status as 'approved' | 'rejected',
    });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// T029: POST /api/communities/:id/emoji/revoke
emoji.post('/communities/:id/revoke', async (c) => {
  try {
    const communityId = c.req.param('id');
    const { shortcode } = await c.req.json();

    if (!/^[0-9a-f]{8}$/.test(communityId)) {
      return c.json({ error: 'Invalid community ID format' }, 400);
    }

    // T021: Remove from cache
    const doId = c.env.COMMUNITY_FEED.idFromName(communityId);
    const doStub = c.env.COMMUNITY_FEED.get(doId);

    await doStub.fetch(
      new Request('http://internal/rpc', {
        method: 'POST',
        body: JSON.stringify({
          method: 'removeEmojiFromRegistry',
          params: { communityId, shortcode },
        }),
      })
    );

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// T030: GET /api/communities/:id/emoji/registry
emoji.get('/communities/:id/registry', async (c) => {
  try {
    const communityId = c.req.param('id');

    if (!/^[0-9a-f]{8}$/.test(communityId)) {
      return c.json({ error: 'Invalid community ID format' }, 400);
    }

    // T019: Get emoji registry from Durable Object cache
    const doId = c.env.COMMUNITY_FEED.idFromName(communityId);
    const doStub = c.env.COMMUNITY_FEED.get(doId);

    const response = await doStub.fetch(
      new Request('http://internal/rpc', {
        method: 'POST',
        body: JSON.stringify({
          method: 'getEmojiRegistry',
          params: { communityId },
        }),
      })
    );

    const result = (await response.json()) as { data?: Record<string, unknown> };

    return c.json({
      emoji: result.data || {},
    });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

export default emoji;
