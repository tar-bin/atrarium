// oRPC API client for Atrarium backend

import type { ClientRouter } from '@atrarium/contracts';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

// Create RPC link with authentication
const link = new RPCLink({
  url: baseURL,
  headers: () => {
    // Get JWT token from localStorage
    const token = localStorage.getItem('auth_token');

    // Return authorization header if token exists
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  },
});

// Create type-safe oRPC client using RouterClient type
// This provides full compile-time type safety from server to client
export const apiClient: ClientRouter = createORPCClient(link);

export default apiClient;

// ============================================================================
// Posts API (018-api-orpc, T011)
// ============================================================================

/**
 * Posts API is fully migrated to oRPC client.
 * Use apiClient.posts directly for type-safe API calls:
 *
 * @example Create post
 * const result = await apiClient.posts.create({
 *   communityId: 'a1b2c3d4',
 *   text: 'Hello world!'
 * });
 *
 * @example List posts
 * const { data, cursor } = await apiClient.posts.list({
 *   communityId: 'a1b2c3d4',
 *   limit: 50
 * });
 *
 * @example Get single post
 * const post = await apiClient.posts.get({
 *   uri: 'at://did:plc:xxx/net.atrarium.group.post/yyy'
 * });
 */

// ============================================================================
// Reaction API (018-api-orpc, T038)
// ============================================================================

/**
 * Reactions API is migrated to oRPC client.
 * Use apiClient.reactions directly for type-safe API calls:
 *
 * @example Add reaction
 * const result = await apiClient.reactions.add({
 *   postUri: 'at://did:plc:xxx/net.atrarium.group.post/yyy',
 *   emoji: { type: 'unicode', value: '👍' },
 *   communityId: 'a1b2c3d4'
 * });
 *
 * @example Remove reaction
 * await apiClient.reactions.remove({
 *   reactionUri: 'at://did:plc:xxx/net.atrarium.community.reaction/zzz'
 * });
 *
 * @example List reactions
 * const { reactions } = await apiClient.reactions.list({
 *   postUri: 'at://did:plc:xxx/net.atrarium.group.post/yyy'
 * });
 */

/**
 * @deprecated Use apiClient.reactions.add() instead. Legacy helper for backward compatibility.
 * This function will be removed after client components are fully migrated.
 */
export async function addReaction(
  postUri: string,
  emoji: { type: 'unicode' | 'custom'; value: string },
  communityId?: string
): Promise<{ success: boolean; reactionUri: string }> {
  // Fallback to community extraction if not provided
  const cid = communityId || extractCommunityIdFromPostUri(postUri);
  return await apiClient.reactions.add({ postUri, emoji, communityId: cid });
}

/**
 * @deprecated Use apiClient.reactions.remove() instead. Legacy helper for backward compatibility.
 * This function will be removed after client components are fully migrated.
 */
export async function removeReaction(reactionUri: string): Promise<{ success: boolean }> {
  return await apiClient.reactions.remove({ reactionUri });
}

/**
 * @deprecated Use apiClient.reactions.list() instead. Legacy helper for backward compatibility.
 * This function will be removed after client components are fully migrated.
 */
export async function listReactions(postUri: string): Promise<{
  reactions: Array<{
    emoji: { type: 'unicode' | 'custom'; value: string };
    count: number;
    reactors: string[];
    currentUserReacted: boolean;
  }>;
}> {
  return await apiClient.reactions.list({ postUri });
}

/**
 * Helper: Extract communityId from post AT-URI
 * Format: at://did:plc:xxx/net.atrarium.group.post/rkey
 * TODO: Implement proper community ID extraction from post metadata
 */
function extractCommunityIdFromPostUri(_postUri: string): string {
  // For now, return empty string (server will reject)
  return '';
}

// ============================================================================
// Reaction SSE Stream (Legacy - oRPC does not support SSE)
// ============================================================================

/**
 * Subscribe to real-time reaction updates via SSE
 * Note: This endpoint remains as legacy Hono route (oRPC limitation)
 */
export function subscribeToReactions(
  communityId: string,
  onUpdate: (data: { postUri: string; reactions: unknown[] }) => void,
  onError?: (error: Error) => void
): () => void {
  const eventSource = new EventSource(
    `${baseURL}/api/reactions/stream/${encodeURIComponent(communityId)}`,
    { withCredentials: true }
  );

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onUpdate(data);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Failed to parse SSE data'));
    }
  };

  eventSource.onerror = () => {
    onError?.(new Error('SSE connection error'));
  };

  // Return cleanup function
  return () => {
    eventSource.close();
  };
}

// ============================================================================
// Custom Emoji API helpers (016-slack-mastodon-misskey, T024-T027)
// ============================================================================

/**
 * Upload custom emoji
 */
export async function uploadEmoji(
  shortcode: string,
  image: File
): Promise<{ success: boolean; emojiUri: string }> {
  const formData = new FormData();
  formData.append('shortcode', shortcode);
  formData.append('image', image);

  const response = await fetch(`${baseURL}/api/emoji/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `Failed to upload emoji: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete custom emoji
 */
export async function deleteEmoji(emojiUri: string): Promise<{ success: boolean }> {
  const response = await fetch(`${baseURL}/api/emoji/delete`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
    },
    body: JSON.stringify({ emojiUri }),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete emoji: ${response.statusText}`);
  }

  return response.json();
}

/**
 * List approved emojis for a community
 */
export async function listEmojis(communityId: string): Promise<{
  emojis: Array<{
    shortcode: string;
    imageUrl: string;
    creator: string;
    animated: boolean;
    dimensions: { width: number; height: number };
  }>;
}> {
  const response = await fetch(
    `${baseURL}/api/emoji/list?communityId=${encodeURIComponent(communityId)}&status=approved`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to list emojis: ${response.statusText}`);
  }

  return response.json();
}

/**
 * List user's uploaded emojis
 */
export async function listUserEmojis(userId: string): Promise<{
  emojis: Array<{
    shortcode: string;
    imageUrl: string;
    emojiUri: string;
    creator: string;
    uploadedAt: string;
    format: 'png' | 'gif' | 'webp';
    size: number;
    dimensions: { width: number; height: number };
    animated: boolean;
    approvalStatus?: 'pending' | 'approved' | 'rejected' | 'revoked';
  }>;
}> {
  const response = await fetch(`${baseURL}/api/emoji/user/${encodeURIComponent(userId)}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list user emojis: ${response.statusText}`);
  }

  return response.json();
}

/**
 * List pending emojis for approval (owner only)
 */
export async function listPendingEmojis(communityId: string): Promise<{
  emojis: Array<{
    shortcode: string;
    emojiRef: string;
    imageUrl: string;
    creator: string;
    creatorHandle?: string;
    uploadedAt: string;
    format: 'png' | 'gif' | 'webp';
    size: number;
    dimensions: { width: number; height: number };
    animated: boolean;
  }>;
}> {
  const response = await fetch(
    `${baseURL}/api/emoji/pending?communityId=${encodeURIComponent(communityId)}`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to list pending emojis: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Approve or reject custom emoji (owner only)
 */
export async function approveEmoji(
  communityId: string,
  emojiRef: string,
  status: 'approved' | 'rejected',
  reason?: string
): Promise<{ success: boolean; approvalUri: string }> {
  const response = await fetch(`${baseURL}/api/emoji/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
    },
    body: JSON.stringify({ communityId, emojiRef, status, reason }),
  });

  if (!response.ok) {
    throw new Error(`Failed to approve emoji: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// Community API helpers
// ============================================================================

/**
 * List communities where user is a member
 */
export async function listCommunities(): Promise<{
  data: Array<{
    id: string;
    name: string;
    description: string | null;
    stage: string;
    parentId: string | null;
    memberCount: number;
    postCount: number;
    createdAt: number;
  }>;
}> {
  const response = await fetch(`${baseURL}/api/communities`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list communities: ${response.statusText}`);
  }

  return response.json();
}
