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
      text?: string;
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
  hashtags: string[];
}

// Heavyweight filter: Extract all #atr_[8-hex] hashtags
const HASHTAG_REGEX = /#atr_[0-9a-f]{8}/g;

function extractHashtags(text: string): string[] {
  const matches = text.match(HASHTAG_REGEX);
  return matches ? Array.from(new Set(matches)) : [];
}

function parsePostEvent(event: JetstreamEvent): PostEvent | null {
  if (
    event.kind !== "commit" ||
    event.commit?.operation !== "create" ||
    event.commit?.collection !== "app.bsky.feed.post" ||
    !event.commit?.record?.text
  ) {
    return null;
  }

  const text = event.commit.record.text;
  const hashtags = extractHashtags(text);

  if (hashtags.length === 0) {
    return null; // No valid hashtags
  }

  const uri = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;
  const createdAt = event.commit.record.createdAt || new Date().toISOString();

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
    const response = await stub.fetch(new Request("http://fake-host/indexPost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(postEvent),
    }));

    if (!response.ok) {
      const error = await response.text();
      console.error(`[FirehoseProcessor] Failed to index post to community ${communityId}:`, error);
    }
  } catch (error) {
    console.error(`[FirehoseProcessor] Error indexing post to community ${communityId}:`, error);
  }
}

export default {
  async queue(batch: MessageBatch<JetstreamEvent>, env: Env): Promise<void> {
    console.log(`[FirehoseProcessor] Processing batch of ${batch.messages.length} events`);

    // Track community -> posts mapping for batching
    const communityPosts = new Map<string, PostEvent[]>();

    for (const message of batch.messages) {
      const event = message.body;
      const postEvent = parsePostEvent(event);

      if (!postEvent) {
        continue;
      }

      // For each hashtag, extract community ID and group posts
      for (const hashtag of postEvent.hashtags) {
        // Extract community ID from hashtag (#atr_12345678 -> 12345678)
        const communityId = hashtag.replace("#atr_", "");

        if (!communityPosts.has(communityId)) {
          communityPosts.set(communityId, []);
        }
        communityPosts.get(communityId)!.push(postEvent);
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

    console.log(`[FirehoseProcessor] Processed ${batch.messages.length} events, indexed ${indexPromises.length} posts`);
  },
};
