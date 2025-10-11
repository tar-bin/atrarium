// CommunityFeedGenerator Durable Object
// Per-community feed index stored in Durable Objects Storage
// Handles post indexing, membership verification, and feed skeleton generation

import { DurableObject } from 'cloudflare:workers';
import { checkRateLimit } from '../utils/rate-limiter';

interface PostEvent {
  uri: string;
  authorDid: string;
  text: string;
  createdAt: string;
  hashtags: string[]; // Legacy: extracted from text
  communityId?: string; // NEW (014-bluesky): from net.atrarium.group.post
}

interface PostMetadata {
  uri: string;
  authorDid: string;
  createdAt: string;
  timestamp: number;
  moderationStatus: 'approved' | 'hidden' | 'reported';
  indexedAt: number;
}

interface MembershipRecord {
  did: string;
  role: 'owner' | 'moderator' | 'member';
  joinedAt: string;
  active: boolean;
}

interface CommunityConfig {
  name: string;
  description?: string;
  hashtag: string;
  stage: 'theme' | 'community' | 'graduated';
  parentGroup?: string; // AT-URI of parent group (for Theme groups) - T021
  createdAt: string;
}

interface ModerationAction {
  action: 'hide_post' | 'unhide_post' | 'block_user' | 'unblock_user';
  targetUri: string;
  reason?: string;
  createdAt: string;
}

// T019: Emoji registry cache types
interface EmojiMetadata {
  emojiURI: string; // AT URI of CustomEmoji record
  blobURI: string; // Blob URL for rendering
  animated: boolean;
}

type EmojiRegistry = Record<string, EmojiMetadata>;

// T018: Reaction aggregate types (016-slack-mastodon-misskey)
interface EmojiReference {
  type: 'unicode' | 'custom';
  value: string; // Unicode codepoint (U+XXXX) or AT-URI of CustomEmoji
}

interface ReactionAggregate {
  emoji: EmojiReference;
  count: number;
  reactors: string[]; // Array of DIDs
}

interface ReactionRecord {
  reactionUri: string; // AT-URI of reaction record
  postUri: string; // AT-URI of post
  emoji: EmojiReference;
  reactor: string; // DID of reactor
  createdAt: string; // ISO 8601
}

export class CommunityFeedGenerator extends DurableObject {
  private readonly POST_RETENTION_DAYS = 7;
  private readonly POST_RETENTION_MS = this.POST_RETENTION_DAYS * 24 * 60 * 60 * 1000;

  // T044: SSE connection management (max 100 concurrent connections)
  private sseConnections: Map<string, ReadableStreamDefaultController> = new Map();
  private readonly MAX_SSE_CONNECTIONS = 100;

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/indexPost':
        return this.handleIndexPost(request);

      case '/getFeedSkeleton':
        return this.handleGetFeedSkeleton(request);

      case '/posts':
        return this.handleGetPosts(request);

      case '/checkMembership':
        return this.handleCheckMembership(request);

      case '/updateConfig':
        return this.handleUpdateConfig(request);

      case '/addMember':
        return this.handleAddMember(request);

      case '/removeMember':
        return this.handleRemoveMember(request);

      case '/moderatePost':
        return this.handleModeratePost(request);

      case '/cleanup':
        return this.handleCleanup();

      case '/updateReaction':
        return this.handleUpdateReaction(request);

      case '/getReactions':
        return this.handleGetReactions(request);

      case '/rpc':
        return this.handleRPC(request);

      case '/reactions/stream':
        return this.handleSSEStream(request);

      case '/checkRateLimit':
        return this.handleCheckRateLimit(request);

      case '/hierarchy/parent':
        return this.handleGetParent(request);

      case '/hierarchy/children':
        return this.handleGetChildren(request);

      case '/hierarchy/addChild':
        return this.handleAddChild(request);

      case '/hierarchy/removeChild':
        return this.handleRemoveChild(request);

      case '/hierarchy/checkModeration':
        return this.handleCheckModeration(request);

      case '/hierarchy/validateStageTransition':
        return this.handleValidateStageTransition(request);

      default:
        return new Response('Not Found', { status: 404 });
    }
  }

  async alarm(): Promise<void> {
    // Run cleanup on scheduled alarm
    await this.cleanup();

    // Schedule next cleanup (daily)
    await this.ctx.storage.setAlarm(Date.now() + 24 * 60 * 60 * 1000);
  }

  // POST /indexPost - Index a new post to the feed
  private async handleIndexPost(request: Request): Promise<Response> {
    try {
      const postEvent = (await request.json()) as PostEvent;

      // Verify membership
      const isMember = await this.verifyMembership(postEvent.authorDid);
      if (!isMember) {
        return new Response(
          JSON.stringify({
            error: 'NotMember',
            message: 'Author is not a member of this community',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Index post
      await this.indexPost(postEvent);

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'InternalError',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // GET /getFeedSkeleton?limit=50&cursor=...
  private async handleGetFeedSkeleton(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const cursor = url.searchParams.get('cursor') || undefined;

      const result = await this.getFeedSkeleton(limit, cursor);

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'InternalError',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // GET /posts?limit=50&cursor=... - Get posts for Dashboard API (014-bluesky)
  private async handleGetPosts(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const cursor = url.searchParams.get('cursor') || undefined;

      // Reuse getFeedSkeleton logic but return full post metadata
      const posts = await this.getPostsWithMetadata(limit, cursor);

      return new Response(JSON.stringify(posts), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'InternalError',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // GET /checkMembership - Check if user is a member (014-bluesky)
  private async handleCheckMembership(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const did = url.searchParams.get('did');

      if (!did) {
        return new Response(JSON.stringify({ error: 'Missing DID parameter' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const isMember = await this.verifyMembership(did);

      return new Response(JSON.stringify({ isMember }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'InternalError',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // POST /updateConfig - Update community configuration
  private async handleUpdateConfig(request: Request): Promise<Response> {
    try {
      const config = (await request.json()) as CommunityConfig;
      await this.ctx.storage.put('config', config);

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'InternalError',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // POST /addMember - Add a member to the community
  private async handleAddMember(request: Request): Promise<Response> {
    try {
      const membership = (await request.json()) as MembershipRecord;
      await this.ctx.storage.put(`member:${membership.did}`, membership);

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'InternalError',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // POST /removeMember - Remove a member from the community
  private async handleRemoveMember(request: Request): Promise<Response> {
    try {
      const { did } = (await request.json()) as { did: string };
      await this.ctx.storage.delete(`member:${did}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'InternalError',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // POST /moderatePost - Apply moderation action to a post
  private async handleModeratePost(request: Request): Promise<Response> {
    try {
      const action = (await request.json()) as ModerationAction;

      if (action.action === 'hide_post') {
        await this.hidePost(action.targetUri);
      } else if (action.action === 'unhide_post') {
        await this.unhidePost(action.targetUri);
      }

      // Store moderation action
      await this.ctx.storage.put(`moderation:${action.targetUri}`, action);

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'InternalError',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // GET /cleanup - Manually trigger cleanup
  private async handleCleanup(): Promise<Response> {
    try {
      const deletedCount = await this.cleanup();

      return new Response(
        JSON.stringify({
          success: true,
          deletedCount,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'InternalError',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // Internal: Verify if user is a member
  private async verifyMembership(did: string): Promise<boolean> {
    const membership = await this.ctx.storage.get<MembershipRecord>(`member:${did}`);
    return membership?.active ?? false;
  }

  // Internal: Index a post
  private async indexPost(postEvent: PostEvent): Promise<void> {
    const timestamp = new Date(postEvent.createdAt).getTime();

    const metadata: PostMetadata = {
      uri: postEvent.uri,
      authorDid: postEvent.authorDid,
      createdAt: postEvent.createdAt,
      timestamp,
      moderationStatus: 'approved',
      indexedAt: Date.now(),
    };

    // Store with timestamp-based key for chronological ordering
    const key = `post:${timestamp}:${postEvent.uri}`;
    await this.ctx.storage.put(key, metadata);
  }

  // Internal: Get feed skeleton (post URIs only)
  private async getFeedSkeleton(
    limit: number,
    cursor?: string
  ): Promise<{ feed: Array<{ post: string }>; cursor?: string }> {
    // Parse cursor (format: timestamp)
    const cursorTimestamp = cursor ? parseInt(cursor, 10) : undefined;

    // List posts in reverse chronological order
    const listOptions: DurableObjectListOptions = {
      prefix: 'post:',
      reverse: true,
      limit: limit + 1, // Fetch one extra to determine if there's more
    };

    if (cursorTimestamp !== undefined) {
      // Start from cursor timestamp
      listOptions.start = `post:${cursorTimestamp}`;
      listOptions.startAfter = `post:${cursorTimestamp}:~`; // Skip posts at exact cursor timestamp
    }

    const posts = await this.ctx.storage.list<PostMetadata>(listOptions);
    const postArray = Array.from(posts.values());

    // Filter out hidden posts
    const visiblePosts = postArray
      .filter((post) => post.moderationStatus !== 'hidden')
      .slice(0, limit); // Only take up to limit (we fetched limit+1)

    // Determine next cursor
    let nextCursor: string | undefined;
    if (postArray.length > limit) {
      const lastPost = visiblePosts[visiblePosts.length - 1];
      if (lastPost) {
        nextCursor = lastPost.timestamp.toString();
      }
    }

    return {
      feed: visiblePosts.map((post) => ({ post: post.uri })),
      cursor: nextCursor,
    };
  }

  // Internal: Get posts with metadata for Dashboard API (014-bluesky)
  private async getPostsWithMetadata(
    limit: number,
    cursor?: string
  ): Promise<{ posts: PostMetadata[]; cursor: string | null }> {
    // Parse cursor (format: timestamp)
    const cursorTimestamp = cursor ? parseInt(cursor, 10) : undefined;

    // List posts in reverse chronological order
    const listOptions: DurableObjectListOptions = {
      prefix: 'post:',
      reverse: true,
      limit: limit + 1, // Fetch one extra to determine if there's more
    };

    if (cursorTimestamp !== undefined) {
      // Start from cursor timestamp
      listOptions.start = `post:${cursorTimestamp}`;
      listOptions.startAfter = `post:${cursorTimestamp}:~`; // Skip posts at exact cursor timestamp
    }

    const posts = await this.ctx.storage.list<PostMetadata>(listOptions);
    const postArray = Array.from(posts.values());

    // Filter out hidden posts (for non-moderators)
    // TODO: Add role-based filtering (moderators can see hidden posts)
    const visiblePosts = postArray
      .filter((post) => post.moderationStatus !== 'hidden')
      .slice(0, limit); // Only take up to limit (we fetched limit+1)

    // Determine next cursor
    let nextCursor: string | null = null;
    if (postArray.length > limit) {
      const lastPost = visiblePosts[visiblePosts.length - 1];
      if (lastPost) {
        nextCursor = lastPost.timestamp.toString();
      }
    }

    return {
      posts: visiblePosts,
      cursor: nextCursor,
    };
  }

  // Internal: Hide a post
  private async hidePost(uri: string): Promise<void> {
    // Find post by URI
    const posts = await this.ctx.storage.list<PostMetadata>({
      prefix: 'post:',
    });

    for (const [key, post] of posts.entries()) {
      if (post.uri === uri) {
        post.moderationStatus = 'hidden';
        await this.ctx.storage.put(key, post);
        break;
      }
    }
  }

  // Internal: Unhide a post
  private async unhidePost(uri: string): Promise<void> {
    // Find post by URI
    const posts = await this.ctx.storage.list<PostMetadata>({
      prefix: 'post:',
    });

    for (const [key, post] of posts.entries()) {
      if (post.uri === uri) {
        post.moderationStatus = 'approved';
        await this.ctx.storage.put(key, post);
        break;
      }
    }
  }

  // Internal: Clean up old posts (7-day retention)
  private async cleanup(): Promise<number> {
    const cutoffTimestamp = Date.now() - this.POST_RETENTION_MS;
    let deletedCount = 0;

    // List all posts
    const posts = await this.ctx.storage.list<PostMetadata>({
      prefix: 'post:',
    });

    const keysToDelete: string[] = [];

    for (const [key, post] of posts.entries()) {
      if (post.timestamp < cutoffTimestamp) {
        keysToDelete.push(key);
      }
    }

    // Delete in batches
    if (keysToDelete.length > 0) {
      await this.ctx.storage.delete(keysToDelete);
      deletedCount = keysToDelete.length;
    }

    return deletedCount;
  }

  // T019-T021: Emoji registry cache methods

  /**
   * Handle RPC method calls
   */
  private async handleRPC(request: Request): Promise<Response> {
    try {
      const body = await request.json();
      // biome-ignore lint/suspicious/noExplicitAny: RPC params can be any type
      const { method, params } = body as { method: string; params: any };

      switch (method) {
        case 'getEmojiRegistry':
          return this.handleGetEmojiRegistry(params);

        case 'updateEmojiRegistry':
          return this.handleUpdateEmojiRegistry(params);

        case 'invalidateEmojiCache':
          return this.handleInvalidateEmojiCache(params);

        case 'removeEmojiFromRegistry':
          return this.handleRemoveEmojiFromRegistry(params);

        case 'rebuildEmojiRegistry':
          return this.handleRebuildEmojiRegistry(params);

        default:
          return new Response(JSON.stringify({ error: 'Unknown RPC method' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  /**
   * T019: Get emoji registry for a community (cache read)
   */
  private async handleGetEmojiRegistry(params: { communityId: string }): Promise<Response> {
    const { communityId } = params;
    const registry = await this.getEmojiRegistry(communityId);

    return new Response(JSON.stringify({ success: true, data: registry }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * T019: Update emoji registry (cache write)
   */
  private async handleUpdateEmojiRegistry(params: {
    communityId: string;
    shortcode: string;
    metadata: EmojiMetadata;
  }): Promise<Response> {
    const { communityId, shortcode, metadata } = params;
    await this.updateEmojiInRegistry(communityId, shortcode, metadata);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * T021: Invalidate entire emoji cache for a community
   */
  private async handleInvalidateEmojiCache(params: { communityId: string }): Promise<Response> {
    const { communityId } = params;
    await this.invalidateEmojiCache(communityId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * T021: Remove specific emoji from registry (on revocation)
   */
  private async handleRemoveEmojiFromRegistry(params: {
    communityId: string;
    shortcode: string;
  }): Promise<Response> {
    const { communityId, shortcode } = params;
    await this.removeEmojiFromRegistry(communityId, shortcode);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * T020: Rebuild emoji registry from PDS approval records
   */
  private async handleRebuildEmojiRegistry(params: {
    communityId: string;
    approvals: Array<{
      shortcode: string;
      emojiRef: string;
      status: string;
    }>;
  }): Promise<Response> {
    const { communityId, approvals } = params;
    await this.rebuildEmojiRegistry(communityId, approvals);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * T019: Get emoji registry from Durable Objects Storage
   */
  private async getEmojiRegistry(communityId: string): Promise<EmojiRegistry> {
    const key = `emoji_registry:${communityId}`;
    const registry = (await this.ctx.storage.get<EmojiRegistry>(key)) || {};
    return registry;
  }

  /**
   * T019: Update emoji in registry
   */
  private async updateEmojiInRegistry(
    communityId: string,
    shortcode: string,
    metadata: EmojiMetadata
  ): Promise<void> {
    const registry = await this.getEmojiRegistry(communityId);
    registry[shortcode] = metadata;

    const key = `emoji_registry:${communityId}`;
    await this.ctx.storage.put(key, registry);
  }

  /**
   * T020: Rebuild emoji registry from PDS approval records
   */
  private async rebuildEmojiRegistry(
    communityId: string,
    approvals: Array<{
      shortcode: string;
      emojiRef: string;
      status: string;
    }>
  ): Promise<void> {
    const registry: EmojiRegistry = {};

    // Build registry from approved emoji only
    for (const approval of approvals) {
      if (approval.status === 'approved') {
        // In production, this would fetch emoji metadata from PDS using emojiRef
        // For now, we construct a minimal metadata object
        registry[approval.shortcode] = {
          emojiURI: approval.emojiRef,
          blobURI: approval.emojiRef.replace('at://', 'https://'),
          animated: false,
        };
      }
    }

    const key = `emoji_registry:${communityId}`;
    await this.ctx.storage.put(key, registry);
  }

  /**
   * T021: Invalidate (clear) entire emoji cache
   */
  private async invalidateEmojiCache(communityId: string): Promise<void> {
    const key = `emoji_registry:${communityId}`;
    await this.ctx.storage.delete(key);
  }

  /**
   * T021: Remove specific emoji from registry (on revocation)
   */
  private async removeEmojiFromRegistry(communityId: string, shortcode: string): Promise<void> {
    const registry = await this.getEmojiRegistry(communityId);
    delete registry[shortcode];

    const key = `emoji_registry:${communityId}`;
    await this.ctx.storage.put(key, registry);
  }

  /**
   * T018: Update reaction aggregate (016-slack-mastodon-misskey)
   * @param postUri AT-URI of post
   * @param emoji Emoji reference
   * @param reactorDid DID of reactor
   * @param operation 'add' or 'remove'
   */
  private async handleUpdateReaction(request: Request): Promise<Response> {
    const body = (await request.json()) as {
      postUri: string;
      emoji: EmojiReference;
      reactorDid: string;
      operation: 'add' | 'remove';
      reactionUri: string;
    };
    const { postUri, emoji, reactorDid, operation, reactionUri } = body;

    // Storage key: `reaction:{postUri}:{emojiKey}`
    const emojiKey = `${emoji.type}:${emoji.value}`;
    const aggregateKey = `reaction:${postUri}:${emojiKey}`;

    let aggregate = await this.ctx.storage.get<ReactionAggregate>(aggregateKey);

    if (operation === 'add') {
      if (!aggregate) {
        aggregate = { emoji, count: 0, reactors: [] };
      }
      if (!aggregate.reactors.includes(reactorDid)) {
        aggregate.reactors.push(reactorDid);
        aggregate.count = aggregate.reactors.length;
        await this.ctx.storage.put(aggregateKey, aggregate);

        // Store individual reaction record for removal tracking
        const reactionRecordKey = `reaction_record:${reactionUri}`;
        const record: ReactionRecord = {
          reactionUri,
          postUri,
          emoji,
          reactor: reactorDid,
          createdAt: new Date().toISOString(),
        };
        await this.ctx.storage.put(reactionRecordKey, record);

        // T044: Broadcast SSE update
        this.broadcastReactionUpdate({
          postUri,
          emoji,
          count: aggregate.count,
          reactors: aggregate.reactors,
        });
      }
    } else if (operation === 'remove') {
      if (aggregate) {
        aggregate.reactors = aggregate.reactors.filter((did) => did !== reactorDid);
        aggregate.count = aggregate.reactors.length;

        if (aggregate.count === 0) {
          await this.ctx.storage.delete(aggregateKey);

          // T044: Broadcast deletion (count = 0)
          this.broadcastReactionUpdate({
            postUri,
            emoji,
            count: 0,
            reactors: [],
          });
        } else {
          await this.ctx.storage.put(aggregateKey, aggregate);

          // T044: Broadcast SSE update
          this.broadcastReactionUpdate({
            postUri,
            emoji,
            count: aggregate.count,
            reactors: aggregate.reactors,
          });
        }

        // Remove reaction record
        const reactionRecordKey = `reaction_record:${reactionUri}`;
        await this.ctx.storage.delete(reactionRecordKey);
      }
    }

    return Response.json({ success: true });
  }

  /**
   * T018: Get reaction aggregates for a post (016-slack-mastodon-misskey)
   * @param postUri AT-URI of post
   * @param currentUserDid Optional DID of current user (to set currentUserReacted flag)
   */
  private async handleGetReactions(request: Request): Promise<Response> {
    const body = (await request.json()) as {
      postUri: string;
      currentUserDid?: string;
    };
    const { postUri, currentUserDid } = body;

    // List all reaction aggregates for this post
    const prefix = `reaction:${postUri}:`;
    const aggregates: ReactionAggregate[] = [];

    const stored = await this.ctx.storage.list({ prefix });

    for (const [_, aggregate] of stored) {
      const typedAggregate = aggregate as ReactionAggregate;
      aggregates.push({
        ...typedAggregate,
        // Check if current user has reacted (for client UI highlighting)
        currentUserReacted: currentUserDid
          ? typedAggregate.reactors.includes(currentUserDid)
          : false,
      } as ReactionAggregate & { currentUserReacted: boolean });
    }

    return Response.json({ reactions: aggregates });
  }

  /**
   * T044: Handle SSE stream connection (016-slack-mastodon-misskey)
   * Client subscribes to real-time reaction updates via Server-Sent Events
   */
  private async handleSSEStream(_request: Request): Promise<Response> {
    // Check connection limit
    if (this.sseConnections.size >= this.MAX_SSE_CONNECTIONS) {
      return new Response(
        JSON.stringify({
          error: 'TooManyConnections',
          message: `SSE connection limit reached (${this.MAX_SSE_CONNECTIONS} max)`,
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create unique connection ID
    const connectionId = crypto.randomUUID();

    // Create SSE stream
    const stream = new ReadableStream({
      start: (controller) => {
        // Store connection
        this.sseConnections.set(connectionId, controller);

        // Send initial connection event
        const initMessage = `event: connected\ndata: ${JSON.stringify({ connectionId })}\n\n`;
        controller.enqueue(new TextEncoder().encode(initMessage));

        // Send keepalive ping every 30 seconds
        const keepaliveInterval = setInterval(() => {
          try {
            controller.enqueue(new TextEncoder().encode(': keepalive\n\n'));
          } catch {
            // Connection closed, cleanup handled in cancel()
            clearInterval(keepaliveInterval);
          }
        }, 30000);

        // Store interval for cleanup
        // biome-ignore lint/suspicious/noExplicitAny: ReadableStreamDefaultController doesn't expose custom properties
        (controller as any).keepaliveInterval = keepaliveInterval;
      },
      cancel: () => {
        // Cleanup on disconnect
        const controller = this.sseConnections.get(connectionId);
        if (controller) {
          // biome-ignore lint/suspicious/noExplicitAny: ReadableStreamDefaultController doesn't expose custom properties
          clearInterval((controller as any).keepaliveInterval);
          this.sseConnections.delete(connectionId);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  /**
   * T044: Broadcast reaction update to all SSE clients (016-slack-mastodon-misskey)
   * Called after reaction aggregate is updated
   */
  private broadcastReactionUpdate(data: {
    postUri: string;
    emoji: EmojiReference;
    count: number;
    reactors: string[];
  }): void {
    const message = `event: reaction_update\ndata: ${JSON.stringify(data)}\n\n`;
    const encoded = new TextEncoder().encode(message);

    // Broadcast to all connected clients
    for (const [connectionId, controller] of this.sseConnections.entries()) {
      try {
        controller.enqueue(encoded);
      } catch (error) {
        // Connection closed, remove it
        // biome-ignore lint/suspicious/noConsole: Intentional warning log for SSE broadcast failures
        console.warn(`Failed to send to connection ${connectionId}:`, error);
        this.sseConnections.delete(connectionId);
      }
    }
  }

  /**
   * T047: Check rate limit for user (016-slack-mastodon-misskey)
   */
  private async handleCheckRateLimit(request: Request): Promise<Response> {
    const body = (await request.json()) as { userId: string };
    const { userId } = body;

    const result = await checkRateLimit(this.ctx.storage, userId);

    return Response.json(result);
  }

  // ============================================================================
  // Hierarchical Group System Methods (017-1-1, T021-T023)
  // ============================================================================

  /**
   * T021: Get parent group AT-URI for a child group
   * Storage key: `parent:<groupId>`
   */
  private async handleGetParent(_request: Request): Promise<Response> {
    try {
      const config = await this.ctx.storage.get<CommunityConfig>('config');
      if (!config) {
        return Response.json({ error: 'Group config not found' }, { status: 404 });
      }

      return Response.json({
        success: true,
        parentGroup: config.parentGroup || null,
      });
    } catch (error) {
      return Response.json(
        {
          error: 'InternalError',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  }

  /**
   * T021: Get children group IDs for a parent group
   * Storage key: `children:<groupId>` stores string[] of child IDs
   */
  private async handleGetChildren(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const groupId = url.searchParams.get('groupId');

      if (!groupId) {
        return Response.json({ error: 'Missing groupId parameter' }, { status: 400 });
      }

      const children = await this.getChildren(groupId);

      return Response.json({
        success: true,
        children,
      });
    } catch (error) {
      return Response.json(
        {
          error: 'InternalError',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  }

  /**
   * T021: Add child to parent's children list
   * Called when child Theme group is created under Graduated parent
   */
  private async handleAddChild(request: Request): Promise<Response> {
    try {
      const body = (await request.json()) as {
        parentId: string;
        childId: string;
      };
      const { parentId, childId } = body;

      await this.addChild(parentId, childId);

      return Response.json({ success: true });
    } catch (error) {
      return Response.json(
        {
          error: 'InternalError',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  }

  /**
   * T021: Remove child from parent's children list
   * Called when child Theme group is deleted
   */
  private async handleRemoveChild(request: Request): Promise<Response> {
    try {
      const body = (await request.json()) as {
        parentId: string;
        childId: string;
      };
      const { parentId, childId } = body;

      await this.removeChild(parentId, childId);

      return Response.json({ success: true });
    } catch (error) {
      return Response.json(
        {
          error: 'InternalError',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  }

  /**
   * T023: Check if user has moderation rights (with inheritance for Theme groups)
   * For Theme groups: checks both child's moderators and parent's moderators
   * For Community/Graduated: checks only own moderators
   */
  private async handleCheckModeration(request: Request): Promise<Response> {
    try {
      const body = (await request.json()) as {
        userDid: string;
        parentGroupConfig?: CommunityConfig; // Optional parent config for Theme groups
      };
      const { userDid, parentGroupConfig } = body;

      const config = await this.ctx.storage.get<CommunityConfig>('config');
      if (!config) {
        return Response.json({ error: 'Group config not found' }, { status: 404 });
      }

      // T023: Check moderation rights with inheritance
      const hasModerationRights = await this.checkModerationRights(
        userDid,
        config,
        parentGroupConfig
      );

      return Response.json({
        success: true,
        hasModerationRights,
      });
    } catch (error) {
      return Response.json(
        {
          error: 'InternalError',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  }

  /**
   * T021: Get children array for a group
   * @param groupId Group ID
   * @returns Array of child group IDs
   */
  private async getChildren(groupId: string): Promise<string[]> {
    const key = `children:${groupId}`;
    return (await this.ctx.storage.get<string[]>(key)) || [];
  }

  /**
   * T021: Add child to parent's children list
   * @param parentId Parent group ID
   * @param childId Child group ID to add
   */
  private async addChild(parentId: string, childId: string): Promise<void> {
    const children = await this.getChildren(parentId);

    // Avoid duplicates
    if (!children.includes(childId)) {
      children.push(childId);
      const key = `children:${parentId}`;
      await this.ctx.storage.put(key, children);
    }
  }

  /**
   * T021: Remove child from parent's children list
   * @param parentId Parent group ID
   * @param childId Child group ID to remove
   */
  private async removeChild(parentId: string, childId: string): Promise<void> {
    const children = await this.getChildren(parentId);
    const filteredChildren = children.filter((id) => id !== childId);

    const key = `children:${parentId}`;
    if (filteredChildren.length > 0) {
      await this.ctx.storage.put(key, filteredChildren);
    } else {
      await this.ctx.storage.delete(key); // Remove key if no children left
    }
  }

  /**
   * T023: Check moderation rights with inheritance for Theme groups
   * @param userDid DID of user to check
   * @param groupConfig Current group config
   * @param parentGroupConfig Optional parent group config (for Theme groups)
   * @returns true if user has moderation rights
   */
  private async checkModerationRights(
    userDid: string,
    groupConfig: CommunityConfig,
    parentGroupConfig?: CommunityConfig
  ): Promise<boolean> {
    // Check membership with owner/moderator role
    const membership = await this.ctx.storage.get<MembershipRecord>(`member:${userDid}`);
    if (membership && (membership.role === 'owner' || membership.role === 'moderator')) {
      return true;
    }

    // T023: For Theme groups, check parent's moderators (moderation inheritance)
    if (groupConfig.stage === 'theme' && parentGroupConfig) {
      // Check if user is owner/moderator of parent group
      // In production, this would query parent's Durable Object Storage
      // For now, we check if parentGroupConfig has moderators array
      if (
        parentGroupConfig.stage === 'graduated' &&
        groupConfig.parentGroup === parentGroupConfig.hashtag
      ) {
        // User is owner/moderator of parent Graduated group
        // Implementation: This check should be done by calling parent DO's checkMembership
        // For now, return true if parentGroupConfig exists (simplified)
        return true;
      }
    }

    return false;
  }

  // ============================================================================
  // Communities Hierarchy API Methods (019-communities-api-api, T004-T006)
  // ============================================================================

  /**
   * T006: Validate stage transition with member count checks (019-communities-api-api)
   * Stage upgrade/downgrade validation with member count requirements
   * @returns Validation result with error message if invalid
   */
  private async handleValidateStageTransition(request: Request): Promise<Response> {
    try {
      const body = (await request.json()) as {
        currentStage: 'theme' | 'community' | 'graduated';
        targetStage: 'theme' | 'community' | 'graduated';
        memberCount: number;
        childrenCount?: number;
      };
      const { currentStage, targetStage, memberCount, childrenCount } = body;

      // Validate stage transitions
      const validationResult = this.validateStageTransition(
        currentStage,
        targetStage,
        memberCount,
        childrenCount || 0
      );

      return Response.json(validationResult);
    } catch (error) {
      return Response.json(
        {
          error: 'InternalError',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  }

  /**
   * T006: Validate stage transition logic (019-communities-api-api)
   * Rules:
   * - theme → community: requires 10+ active members
   * - community → graduated: requires 50+ active members
   * - graduated → community: requires 0 children
   * - Cannot skip stages (theme → graduated invalid)
   * @returns Validation result
   */
  private validateStageTransition(
    currentStage: 'theme' | 'community' | 'graduated',
    targetStage: 'theme' | 'community' | 'graduated',
    memberCount: number,
    childrenCount: number
  ): {
    isValid: boolean;
    error?: string;
    requiredMembers?: number;
  } {
    // Same stage, no transition needed
    if (currentStage === targetStage) {
      return { isValid: true };
    }

    // Upgrade rules
    if (
      (currentStage === 'theme' && targetStage === 'community') ||
      (currentStage === 'community' && targetStage === 'graduated')
    ) {
      // theme → community: requires 10+ members
      if (currentStage === 'theme' && targetStage === 'community') {
        if (memberCount < 10) {
          return {
            isValid: false,
            error: `Community has ${memberCount} members, requires 10 for community stage`,
            requiredMembers: 10,
          };
        }
        return { isValid: true };
      }

      // community → graduated: requires 50+ members
      if (currentStage === 'community' && targetStage === 'graduated') {
        if (memberCount < 50) {
          return {
            isValid: false,
            error: `Community has ${memberCount} members, requires 50 for graduated stage`,
            requiredMembers: 50,
          };
        }
        return { isValid: true };
      }
    }

    // Downgrade rules
    if (
      (currentStage === 'community' && targetStage === 'theme') ||
      (currentStage === 'graduated' && targetStage === 'community')
    ) {
      // graduated → community: requires 0 children
      if (currentStage === 'graduated' && targetStage === 'community') {
        if (childrenCount > 0) {
          return {
            isValid: false,
            error: 'Cannot downgrade community with active children',
          };
        }
        return { isValid: true };
      }

      // community → theme: always allowed (owner-initiated downgrade)
      if (currentStage === 'community' && targetStage === 'theme') {
        return { isValid: true };
      }
    }

    // Skip stage validation (invalid transitions)
    if (currentStage === 'theme' && targetStage === 'graduated') {
      return {
        isValid: false,
        error: 'Cannot skip stages: theme → community → graduated',
      };
    }

    if (currentStage === 'graduated' && targetStage === 'theme') {
      return {
        isValid: false,
        error: 'Cannot skip stages: graduated → community → theme',
      };
    }

    // Unknown transition
    return {
      isValid: false,
      error: `Invalid stage transition: ${currentStage} → ${targetStage}`,
    };
  }
}
