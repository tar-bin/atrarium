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
];
