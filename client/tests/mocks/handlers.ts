import { HttpResponse, http } from 'msw';
import type { Community, Feed, Post } from '../../src/types';

const API_URL = 'http://localhost:8787';
const PDS_URL = 'http://localhost:3000';

// Sample mock data
const mockCommunities: Community[] = [
  {
    id: 'comm-001',
    name: 'Test Community',
    description: 'A test community for development',
    stage: 'theme',
    parentId: null,
    ownerDid: 'did:plc:owner123',
    memberCount: 5,
    postCount: 10,
    createdAt: Math.floor(Date.now() / 1000) - 86400,
    graduatedAt: null,
    archivedAt: null,
  },
];

const mockFeeds: Feed[] = [
  {
    id: 'feed-001',
    communityId: 'comm-001',
    name: 'General Discussion',
    description: 'General discussion feed',
    status: 'active',
    hashtag: '#atr_abc12345',
    posts7d: 5,
    activeUsers7d: 3,
    lastPostAt: Math.floor(Date.now() / 1000) - 3600,
    createdAt: Math.floor(Date.now() / 1000) - 43200,
  },
];

const mockPosts: Post[] = [
  {
    id: 1,
    uri: 'at://did:plc:user123/app.bsky.feed.post/abc123',
    feedId: 'feed-001',
    authorDid: 'did:plc:user123',
    text: 'Hello from the test post! #atr_abc12345',
    createdAt: Math.floor(Date.now() / 1000) - 3600,
    hasMedia: false,
    langs: ['en'],
    moderationStatus: 'approved',
    indexedAt: Math.floor(Date.now() / 1000) - 3600,
  },
];

// Mock emoji data (016-slack-mastodon-misskey)
interface MockEmoji {
  uri: string;
  shortcode: string;
  blobRef: { $type: string; ref: string; mimeType: string; size: number };
  communityId: string;
  approved: boolean;
  creatorDid: string;
  createdAt: string;
}

const mockEmojis: MockEmoji[] = [
  {
    uri: 'at://did:plc:owner123/net.atrarium.community.emoji/test1',
    shortcode: 'test_emoji',
    blobRef: {
      $type: 'blob',
      ref: 'bafyblob1',
      mimeType: 'image/png',
      size: 1024,
    },
    communityId: 'comm-001',
    approved: true,
    creatorDid: 'did:plc:owner123',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    uri: 'at://did:plc:user123/net.atrarium.community.emoji/pending1',
    shortcode: 'pending_emoji',
    blobRef: {
      $type: 'blob',
      ref: 'bafyblob2',
      mimeType: 'image/png',
      size: 2048,
    },
    communityId: 'comm-001',
    approved: false,
    creatorDid: 'did:plc:user123',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const handlers = [
  // GET /api/communities - List all communities
  http.get(`${API_URL}/api/communities`, () => {
    return HttpResponse.json(mockCommunities);
  }),

  // POST /api/communities - Create new community
  http.post(`${API_URL}/api/communities`, async ({ request }) => {
    const body = (await request.json()) as { name: string; description?: string };
    const newCommunity: Community = {
      id: `comm-${Date.now()}`,
      name: body.name,
      description: body.description || null,
      stage: 'theme',
      parentId: null,
      ownerDid: 'did:plc:owner123',
      memberCount: 1,
      postCount: 0,
      createdAt: Math.floor(Date.now() / 1000),
      graduatedAt: null,
      archivedAt: null,
    };
    mockCommunities.push(newCommunity);
    return HttpResponse.json(newCommunity, { status: 201 });
  }),

  // PATCH /api/communities/:id - Update community (T000a)
  http.patch(`${API_URL}/api/communities/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as { name?: string; description?: string };
    const community = mockCommunities.find((c) => c.id === id);

    if (!community) {
      return HttpResponse.json({ error: 'NotFound' }, { status: 404 });
    }

    if (body.name) community.name = body.name;
    if (body.description !== undefined) community.description = body.description;

    return HttpResponse.json({ success: true });
  }),

  // POST /api/communities/:id/close - Close/archive community (T000b)
  http.post(`${API_URL}/api/communities/:id/close`, ({ params }) => {
    const { id } = params;
    const community = mockCommunities.find((c) => c.id === id);

    if (!community) {
      return HttpResponse.json({ error: 'NotFound' }, { status: 404 });
    }

    if (community.archivedAt) {
      return HttpResponse.json(
        { error: 'Conflict', message: 'Community is already archived' },
        { status: 409 }
      );
    }

    community.archivedAt = Math.floor(Date.now() / 1000);
    return HttpResponse.json({ success: true, community });
  }),

  // GET /api/communities/:id/feeds - Get feeds for community
  http.get(`${API_URL}/api/communities/:id/feeds`, ({ params }) => {
    const { id } = params;
    const feeds = mockFeeds.filter((f) => f.communityId === id);
    return HttpResponse.json(feeds);
  }),

  // POST /api/communities/:id/feeds - Create new feed
  http.post(`${API_URL}/api/communities/:id/feeds`, async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as { name: string; description?: string };
    const newFeed: Feed = {
      id: `feed-${Date.now()}`,
      communityId: id as string,
      name: body.name,
      description: body.description || null,
      status: 'active',
      hashtag: `#atr_${Math.random().toString(16).slice(2, 10)}`,
      posts7d: 0,
      activeUsers7d: 0,
      lastPostAt: null,
      createdAt: Math.floor(Date.now() / 1000),
    };
    mockFeeds.push(newFeed);
    return HttpResponse.json(newFeed, { status: 201 });
  }),

  // GET /api/posts?feedId=xxx - Get posts for feed
  http.get(`${API_URL}/api/posts`, ({ request }) => {
    const url = new URL(request.url);
    const feedId = url.searchParams.get('feedId');
    const posts = mockPosts.filter((p) => p.feedId === feedId);
    return HttpResponse.json(posts);
  }),

  // POST /api/moderation/posts/:uri/hide - Hide post
  http.post(`${API_URL}/api/moderation/posts/:uri/hide`, ({ params }) => {
    const { uri } = params;
    const post = mockPosts.find((p) => p.uri === decodeURIComponent(uri as string));

    if (!post) {
      return HttpResponse.json({ error: 'NotFound' }, { status: 404 });
    }

    post.moderationStatus = 'hidden';
    return HttpResponse.json({ success: true });
  }),

  // POST http://localhost:3000/xrpc/com.atproto.server.createSession - PDS login
  http.post(`${PDS_URL}/xrpc/com.atproto.server.createSession`, async ({ request }) => {
    const body = (await request.json()) as { identifier: string; password: string };

    if (body.password === 'test123') {
      return HttpResponse.json({
        did: 'did:plc:test123',
        handle: body.identifier,
        accessJwt: 'mock-access-token',
        refreshJwt: 'mock-refresh-token',
      });
    }

    return HttpResponse.json({ error: 'AuthenticationRequired' }, { status: 401 });
  }),

  // Emoji API endpoints (016-slack-mastodon-misskey, 018-api-orpc)
  // POST /api/emoji/upload - Upload custom emoji
  http.post(`${API_URL}/api/emoji/upload`, async ({ request }) => {
    const body = (await request.json()) as {
      shortcode: string;
      fileData: string;
      mimeType: string;
      size: number;
      dimensions: { width: number; height: number };
      animated: boolean;
    };

    const newEmoji: MockEmoji = {
      uri: `at://did:plc:test123/net.atrarium.community.emoji/${Date.now()}`,
      shortcode: body.shortcode,
      blobRef: {
        $type: 'blob',
        ref: `bafyblob${Date.now()}`,
        mimeType: body.mimeType,
        size: body.size,
      },
      communityId: '',
      approved: false,
      creatorDid: 'did:plc:test123',
      createdAt: new Date().toISOString(),
    };

    mockEmojis.push(newEmoji);

    return HttpResponse.json({
      uri: newEmoji.uri,
      shortcode: newEmoji.shortcode,
      approved: false,
    });
  }),

  // GET /api/emoji/list - List user's uploaded emojis
  http.get(`${API_URL}/api/emoji/list`, () => {
    const userEmojis = mockEmojis.filter((e) => e.creatorDid === 'did:plc:test123');
    return HttpResponse.json({
      data: userEmojis.map((e) => ({
        uri: e.uri,
        shortcode: e.shortcode,
        approved: e.approved,
        createdAt: e.createdAt,
      })),
    });
  }),

  // POST /api/communities/:id/emoji/submit - Submit emoji for approval
  http.post(`${API_URL}/api/communities/:id/emoji/submit`, async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as { communityId: string; emojiUri: string };

    const emoji = mockEmojis.find((e) => e.uri === body.emojiUri);
    if (!emoji) {
      return HttpResponse.json({ error: 'NotFound' }, { status: 404 });
    }

    emoji.communityId = id as string;

    return HttpResponse.json({
      success: true,
      status: 'pending',
    });
  }),

  // GET /api/communities/:id/emoji/pending - List pending emoji approvals
  http.get(`${API_URL}/api/communities/:id/emoji/pending`, ({ params }) => {
    const { id } = params;
    const pendingEmojis = mockEmojis.filter((e) => e.communityId === id && !e.approved);

    return HttpResponse.json({
      data: pendingEmojis.map((e) => ({
        uri: e.uri,
        shortcode: e.shortcode,
        creatorDid: e.creatorDid,
        approved: e.approved,
        createdAt: e.createdAt,
      })),
    });
  }),

  // POST /api/communities/:id/emoji/approve - Approve/reject emoji
  http.post(`${API_URL}/api/communities/:id/emoji/approve`, async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as {
      communityId: string;
      emojiUri: string;
      approve: boolean;
    };

    const emoji = mockEmojis.find((e) => e.uri === body.emojiUri && e.communityId === id);
    if (!emoji) {
      return HttpResponse.json({ error: 'NotFound' }, { status: 404 });
    }

    if (body.approve) {
      emoji.approved = true;
      return HttpResponse.json({
        uri: emoji.uri,
        approved: true,
      });
    }

    // Reject: remove from list
    const index = mockEmojis.findIndex((e) => e.uri === body.emojiUri);
    if (index !== -1) {
      mockEmojis.splice(index, 1);
    }

    return HttpResponse.json({
      success: true,
    });
  }),

  // POST /api/communities/:id/emoji/revoke - Revoke approved emoji
  http.post(`${API_URL}/api/communities/:id/emoji/revoke`, async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as { communityId: string; emojiUri: string };

    const emoji = mockEmojis.find((e) => e.uri === body.emojiUri && e.communityId === id);
    if (!emoji) {
      return HttpResponse.json({ error: 'NotFound' }, { status: 404 });
    }

    emoji.approved = false;

    return HttpResponse.json({
      success: true,
    });
  }),

  // GET /api/communities/:id/emoji/registry - Get emoji registry (public)
  http.get(`${API_URL}/api/communities/:id/emoji/registry`, ({ params }) => {
    const { id } = params;
    const approvedEmojis = mockEmojis.filter((e) => e.communityId === id && e.approved);

    return HttpResponse.json({
      data: approvedEmojis.map((e) => ({
        uri: e.uri,
        shortcode: e.shortcode,
        approved: e.approved,
        blobRef: e.blobRef,
      })),
    });
  }),
];
