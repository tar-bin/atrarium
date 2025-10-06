// CommunityFeedGenerator Durable Object
// Per-community feed index stored in Durable Objects Storage
// Handles post indexing, membership verification, and feed skeleton generation

import { DurableObject } from "cloudflare:workers";
import type { Env } from "../types";

interface PostEvent {
  uri: string;
  authorDid: string;
  text: string;
  createdAt: string;
  hashtags: string[];
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

export class CommunityFeedGenerator extends DurableObject {
  private readonly POST_RETENTION_DAYS = 7;
  private readonly POST_RETENTION_MS = this.POST_RETENTION_DAYS * 24 * 60 * 60 * 1000;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/indexPost":
        return this.handleIndexPost(request);

      case "/getFeedSkeleton":
        return this.handleGetFeedSkeleton(request);

      case "/updateConfig":
        return this.handleUpdateConfig(request);

      case "/addMember":
        return this.handleAddMember(request);

      case "/removeMember":
        return this.handleRemoveMember(request);

      case "/moderatePost":
        return this.handleModeratePost(request);

      case "/cleanup":
        return this.handleCleanup();

      default:
        return new Response("Not Found", { status: 404 });
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
      const postEvent = await request.json() as PostEvent;

      // Verify membership
      const isMember = await this.verifyMembership(postEvent.authorDid);
      if (!isMember) {
        return new Response(JSON.stringify({
          error: "NotMember",
          message: "Author is not a member of this community",
        }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Index post
      await this.indexPost(postEvent);

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "InternalError",
        message: error instanceof Error ? error.message : "Unknown error",
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // GET /getFeedSkeleton?limit=50&cursor=...
  private async handleGetFeedSkeleton(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get("limit") || "50", 10);
      const cursor = url.searchParams.get("cursor") || undefined;

      const result = await this.getFeedSkeleton(limit, cursor);

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "InternalError",
        message: error instanceof Error ? error.message : "Unknown error",
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // POST /updateConfig - Update community configuration
  private async handleUpdateConfig(request: Request): Promise<Response> {
    try {
      const config = await request.json() as CommunityConfig;
      await this.ctx.storage.put("config", config);

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "InternalError",
        message: error instanceof Error ? error.message : "Unknown error",
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // POST /addMember - Add a member to the community
  private async handleAddMember(request: Request): Promise<Response> {
    try {
      const membership = await request.json() as MembershipRecord;
      await this.ctx.storage.put(`member:${membership.did}`, membership);

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "InternalError",
        message: error instanceof Error ? error.message : "Unknown error",
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // POST /removeMember - Remove a member from the community
  private async handleRemoveMember(request: Request): Promise<Response> {
    try {
      const { did } = await request.json() as { did: string };
      await this.ctx.storage.delete(`member:${did}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "InternalError",
        message: error instanceof Error ? error.message : "Unknown error",
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // POST /moderatePost - Apply moderation action to a post
  private async handleModeratePost(request: Request): Promise<Response> {
    try {
      const action = await request.json() as ModerationAction;

      if (action.action === "hide_post") {
        await this.hidePost(action.targetUri);
      } else if (action.action === "unhide_post") {
        await this.unhidePost(action.targetUri);
      }

      // Store moderation action
      await this.ctx.storage.put(`moderation:${action.targetUri}`, action);

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "InternalError",
        message: error instanceof Error ? error.message : "Unknown error",
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // GET /cleanup - Manually trigger cleanup
  private async handleCleanup(): Promise<Response> {
    try {
      const deletedCount = await this.cleanup();

      return new Response(JSON.stringify({
        success: true,
        deletedCount,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "InternalError",
        message: error instanceof Error ? error.message : "Unknown error",
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Internal: Verify if user is a member
  private async verifyMembership(did: string): Promise<boolean> {
    const membership = await this.ctx.storage.get<MembershipRecord>(`member:${did}`);
    return membership !== undefined && membership.active;
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
      prefix: "post:",
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
    const visiblePosts = postArray.filter(
      post => post.moderationStatus !== 'hidden'
    ).slice(0, limit); // Only take up to limit (we fetched limit+1)

    // Determine next cursor
    let nextCursor: string | undefined;
    if (postArray.length > limit) {
      const lastPost = visiblePosts[visiblePosts.length - 1];
      if (lastPost) {
        nextCursor = lastPost.timestamp.toString();
      }
    }

    return {
      feed: visiblePosts.map(post => ({ post: post.uri })),
      cursor: nextCursor,
    };
  }

  // Internal: Hide a post
  private async hidePost(uri: string): Promise<void> {
    // Find post by URI
    const posts = await this.ctx.storage.list<PostMetadata>({
      prefix: "post:",
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
      prefix: "post:",
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
      prefix: "post:",
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

    console.log(`[CommunityFeedGenerator] Cleaned up ${deletedCount} posts older than ${this.POST_RETENTION_DAYS} days`);

    return deletedCount;
  }
}
