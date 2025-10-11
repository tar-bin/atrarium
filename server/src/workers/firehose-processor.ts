// FirehoseProcessor Worker
// Queue consumer that processes batched Firehose events
// Performs heavyweight filtering and routes to CommunityFeedGenerator Durable Objects

interface Env {
  COMMUNITY_FEED: DurableObjectNamespace;
}

interface JetstreamEvent {
  did: string;
  time_us: number;
  kind: string;
  commit?: {
    record?: {
      $type?: string; // NEW (014-bluesky): Lexicon type
      text?: string;
      communityId?: string; // NEW (014-bluesky): net.atrarium.group.post field
      createdAt?: string;
      parentGroup?: string; // NEW (017-1-1): net.atrarium.group.config.parentGroup
      stage?: string; // NEW (017-1-1): net.atrarium.group.config.stage
      [key: string]: unknown;
    };
    operation: string;
    collection: string;
    rkey: string;
  };
}

// T024: Group config event for hierarchy validation
interface GroupConfigEvent {
  uri: string;
  did: string;
  stage: 'theme' | 'community' | 'graduated';
  parentGroup?: string; // AT-URI of parent group
  createdAt: string;
}

interface PostEvent {
  uri: string;
  authorDid: string;
  text: string;
  createdAt: string;
  hashtags: string[]; // Legacy: extracted from text
  communityId?: string; // NEW (014-bluesky): from net.atrarium.group.post
}

// Heavyweight filter: Extract all #atrarium_[8-hex] hashtags
const HASHTAG_REGEX = /#atrarium_[0-9a-f]{8}/g;

function extractHashtags(text: string): string[] {
  const matches = text.match(HASHTAG_REGEX);
  return matches ? Array.from(new Set(matches)) : [];
}

/**
 * T024: Parse group config event from Firehose
 * Validates hierarchy constraints during indexing
 */
function parseGroupConfigEvent(event: JetstreamEvent): GroupConfigEvent | null {
  if (event.kind !== 'commit' || event.commit?.operation !== 'create') {
    return null;
  }

  const collection = event.commit?.collection;
  const record = event.commit?.record;

  if (collection !== 'net.atrarium.group.config') {
    return null;
  }

  if (!record?.stage) {
    return null; // Invalid group config (stage is required)
  }

  const stage = record.stage as 'theme' | 'community' | 'graduated';
  const parentGroup = record.parentGroup as string | undefined;
  const uri = `at://${event.did}/${collection}/${event.commit.rkey}`;
  const createdAt = (record.createdAt as string) || new Date().toISOString();

  // T024: Validate parent-child stage combinations
  if (parentGroup) {
    // Only Theme can have parents
    if (stage !== 'theme') {
      // biome-ignore lint/suspicious/noConsole: Firehose validation warning
      console.warn(
        `[Firehose] Invalid parent-child: Only Theme-stage groups can have parents. Group: ${uri}, Stage: ${stage}`
      );
      return null; // Reject: Non-theme group has parent
    }

    // Validate parent AT-URI format
    if (!parentGroup.startsWith('at://')) {
      // biome-ignore lint/suspicious/noConsole: Firehose validation warning
      console.warn(
        `[Firehose] Invalid parentGroup AT-URI format: ${parentGroup} for group: ${uri}`
      );
      return null;
    }

    // T024: Validate no circular references (parent cannot have parent)
    // This is enforced by max depth = 1 constraint
    // Actual parent stage validation (must be Graduated) done in PDS service
  }

  return {
    uri,
    did: event.did,
    stage,
    parentGroup,
    createdAt,
  };
}

/**
 * T024: Validate hierarchy constraints for group config event
 * @returns Validation result
 */
function validateHierarchyConstraints(config: GroupConfigEvent): {
  valid: boolean;
  error?: string;
} {
  // T024: Max depth 1 level - Theme groups with parents cannot have children
  // (This is enforced at creation time in PDS service, not here)

  // T024: Only Theme can have parents
  if (config.parentGroup && config.stage !== 'theme') {
    return {
      valid: false,
      error: `Only Theme-stage groups can have parents. Stage: ${config.stage}`,
    };
  }

  return { valid: true };
}

function parsePostEvent(event: JetstreamEvent): PostEvent | null {
  if (event.kind !== 'commit' || event.commit?.operation !== 'create') {
    return null;
  }

  const collection = event.commit?.collection;
  const record = event.commit?.record;

  // Support both app.bsky.feed.post (legacy) and net.atrarium.group.post (custom)
  if (collection !== 'app.bsky.feed.post' && collection !== 'net.atrarium.group.post') {
    return null;
  }

  if (!record?.text) {
    return null;
  }

  const text = record.text;
  const uri = `at://${event.did}/${collection}/${event.commit.rkey}`;
  const createdAt = record.createdAt || new Date().toISOString();

  // For net.atrarium.group.post: use native communityId field
  if (collection === 'net.atrarium.group.post' && record.communityId) {
    const communityId = record.communityId as string;

    // Validate communityId format (8-char hex)
    if (!/^[0-9a-f]{8}$/.test(communityId)) {
      return null; // Invalid communityId format
    }

    return {
      uri,
      authorDid: event.did,
      text,
      createdAt,
      hashtags: [], // No hashtags for custom Lexicon
      communityId,
    };
  }

  // For app.bsky.feed.post: extract hashtags from text (legacy)
  const hashtags = extractHashtags(text);

  if (hashtags.length === 0) {
    return null; // No valid hashtags
  }

  return {
    uri,
    authorDid: event.did,
    text,
    createdAt,
    hashtags,
  };
}

async function indexPostToCommunity(
  env: Env,
  communityId: string,
  postEvent: PostEvent
): Promise<void> {
  try {
    const id = env.COMMUNITY_FEED.idFromName(communityId);
    const stub = env.COMMUNITY_FEED.get(id);

    // RPC call to CommunityFeedGenerator
    const response = await stub.fetch(
      new Request('http://fake-host/indexPost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postEvent),
      })
    );

    if (!response.ok) {
      await response.text(); // Consume response body
    }
  } catch {
    // Silently ignore errors in background processing
  }
}

/**
 * T024-T025: Index group config event to Durable Objects
 * Updates parent/children cache when group config is created
 */
async function indexGroupConfig(env: Env, config: GroupConfigEvent): Promise<void> {
  try {
    // Validate hierarchy constraints
    const validation = validateHierarchyConstraints(config);
    if (!validation.valid) {
      // biome-ignore lint/suspicious/noConsole: Firehose validation error
      console.error(`[Firehose] Hierarchy validation failed: ${validation.error}`);
      return;
    }

    // T025: If group has a parent, update parent's children list
    if (config.parentGroup) {
      // Extract parent community ID from AT-URI
      const parentMatch = config.parentGroup.match(
        /at:\/\/([^/]+)\/net\.atrarium\.group\.config\/([^/]+)/
      );
      if (parentMatch?.[2]) {
        const parentId = parentMatch[2]; // Use rkey as community ID
        const childMatch = config.uri.match(/\/([^/]+)$/);
        const childId = childMatch?.[1] || ''; // Extract child rkey

        if (!childId) {
          return; // Invalid child ID
        }

        // Update parent's children list via Durable Object
        const parentDOId = env.COMMUNITY_FEED.idFromName(parentId);
        const parentStub = env.COMMUNITY_FEED.get(parentDOId);

        await parentStub.fetch(
          new Request('http://fake-host/hierarchy/addChild', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parentId, childId }),
          })
        );
      }
    }
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: Firehose processing error
    console.error('[Firehose] Failed to index group config:', error);
  }
}

export default {
  async queue(batch: MessageBatch<JetstreamEvent>, env: Env): Promise<void> {
    // Track community -> posts mapping for batching
    const communityPosts = new Map<string, PostEvent[]>();

    // T024-T025: Track group config events for hierarchy updates
    const groupConfigEvents: GroupConfigEvent[] = [];

    for (const message of batch.messages) {
      const event = message.body;

      // T024-T025: Parse group config events (for hierarchy indexing)
      const groupConfigEvent = parseGroupConfigEvent(event);
      if (groupConfigEvent) {
        groupConfigEvents.push(groupConfigEvent);
        continue; // Group config events are handled separately
      }

      // Parse post events (existing logic)
      const postEvent = parsePostEvent(event);
      if (!postEvent) {
        continue;
      }

      // NEW (014-bluesky): Support native communityId field
      if (postEvent.communityId) {
        // Custom Lexicon: use native communityId
        if (!communityPosts.has(postEvent.communityId)) {
          communityPosts.set(postEvent.communityId, []);
        }
        communityPosts.get(postEvent.communityId)?.push(postEvent);
      } else {
        // Legacy: extract community ID from hashtags
        for (const hashtag of postEvent.hashtags) {
          // Extract community ID from hashtag (#atrarium_12345678 -> 12345678)
          const communityId = hashtag.replace('#atrarium_', '');

          if (!communityPosts.has(communityId)) {
            communityPosts.set(communityId, []);
          }
          communityPosts.get(communityId)?.push(postEvent);
        }
      }
    }

    // Index posts to each community
    const indexPromises: Promise<void>[] = [];

    for (const [communityId, posts] of communityPosts.entries()) {
      for (const post of posts) {
        indexPromises.push(indexPostToCommunity(env, communityId, post));
      }
    }

    // T024-T025: Index group config events (hierarchy updates)
    for (const configEvent of groupConfigEvents) {
      indexPromises.push(indexGroupConfig(env, configEvent));
    }

    // Wait for all indexing operations to complete
    await Promise.allSettled(indexPromises);
  },
};
