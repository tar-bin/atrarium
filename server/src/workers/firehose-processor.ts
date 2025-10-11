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
      [key: string]: unknown;
    };
    operation: string;
    collection: string;
    rkey: string;
  };
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

export default {
  async queue(batch: MessageBatch<JetstreamEvent>, env: Env): Promise<void> {
    // Track community -> posts mapping for batching
    const communityPosts = new Map<string, PostEvent[]>();

    for (const message of batch.messages) {
      const event = message.body;
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

    // Wait for all indexing operations to complete
    await Promise.allSettled(indexPromises);
  },
};
