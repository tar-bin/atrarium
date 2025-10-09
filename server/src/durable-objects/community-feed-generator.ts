// CommunityFeedGenerator Durable Object
// Per-community feed index stored in Durable Objects Storage
// Handles post indexing, membership verification, and feed skeleton generation

import { DurableObject } from 'cloudflare:workers';

interface PostEvent {
  uri: string;
  authorDid: string;
  text: string;
  createdAt: string;
  hashtags: string[]; // Legacy: extracted from text
  communityId?: string; // NEW (014-bluesky): from net.atrarium.community.post
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

export class CommunityFeedGenerator extends DurableObject {
  private readonly POST_RETENTION_DAYS = 7;
  private readonly POST_RETENTION_MS = this.POST_RETENTION_DAYS * 24 * 60 * 60 * 1000;

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

      case '/rpc':
        return this.handleRPC(request);

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
}
