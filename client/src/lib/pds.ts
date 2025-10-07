import { BskyAgent } from '@atproto/api';

/**
 * Create a new BskyAgent instance connected to the configured PDS
 * @returns New BskyAgent instance
 */
export function createPDSAgent(): BskyAgent {
  const pdsUrl = import.meta.env.VITE_PDS_URL || 'http://localhost:3000';
  return new BskyAgent({ service: pdsUrl });
}

/**
 * Login to PDS with handle and password
 * @param handle User's Bluesky handle (e.g., "alice.test")
 * @param password User's password
 * @returns Authenticated BskyAgent with session
 * @throws Error if login fails
 */
export async function loginToPDS(handle: string, password: string): Promise<BskyAgent> {
  const agent = createPDSAgent();

  try {
    await agent.login({
      identifier: handle,
      password,
    });

    return agent;
  } catch (_error) {
    throw new Error('Failed to login to PDS. Please check your credentials.');
  }
}

/**
 * Create a post on PDS (Bluesky)
 * @param agent Authenticated BskyAgent instance
 * @param text Post text content
 * @returns Post URI (at://did:plc:xxx/app.bsky.feed.post/yyy)
 * @throws Error if post creation fails
 */
export async function postToPDS(agent: BskyAgent, text: string): Promise<string> {
  if (!agent.session) {
    throw new Error('Agent is not authenticated. Please login first.');
  }

  try {
    const response = await agent.post({
      text,
      createdAt: new Date().toISOString(),
    });

    return response.uri;
  } catch (_error) {
    throw new Error('Failed to create post on PDS.');
  }
}

/**
 * Get current session DID from authenticated agent
 * @param agent BskyAgent instance
 * @returns DID string or null if not authenticated
 */
export function getSessionDID(agent: BskyAgent): string | null {
  return agent.session?.did || null;
}

/**
 * Get current session handle from authenticated agent
 * @param agent BskyAgent instance
 * @returns Handle string or null if not authenticated
 */
export function getSessionHandle(agent: BskyAgent): string | null {
  return agent.session?.handle || null;
}

/**
 * Resume session from stored session data
 * @param sessionData Stored session data from previous login
 * @returns Authenticated BskyAgent with restored session
 * @throws Error if session resume fails
 */
// biome-ignore lint/suspicious/noExplicitAny: BskyAgent session data type is not exported
export async function resumeSession(sessionData: any): Promise<BskyAgent> {
  const agent = createPDSAgent();

  try {
    await agent.resumeSession(sessionData);
    return agent;
  } catch (_error) {
    throw new Error('Failed to resume session. Please login again.');
  }
}
