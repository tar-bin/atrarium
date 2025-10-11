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
// Reaction API helpers (016-slack-mastodon-misskey, T031)
// ============================================================================

/**
 * Add reaction to a post
 */
export async function addReaction(
  postUri: string,
  emoji: { type: 'unicode' | 'custom'; value: string }
): Promise<{ success: boolean; reactionUri: string }> {
  const response = await fetch(`${baseURL}/api/reactions/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
    },
    body: JSON.stringify({ postUri, emoji }),
  });

  if (!response.ok) {
    throw new Error(`Failed to add reaction: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Remove reaction from a post
 */
export async function removeReaction(reactionUri: string): Promise<{ success: boolean }> {
  const response = await fetch(`${baseURL}/api/reactions/remove`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
    },
    body: JSON.stringify({ reactionUri }),
  });

  if (!response.ok) {
    throw new Error(`Failed to remove reaction: ${response.statusText}`);
  }

  return response.json();
}

/**
 * List reactions for a post
 */
export async function listReactions(postUri: string): Promise<{
  reactions: Array<{
    emoji: { type: 'unicode' | 'custom'; value: string };
    count: number;
    reactors: string[];
    currentUserReacted: boolean;
  }>;
}> {
  const response = await fetch(
    `${baseURL}/api/reactions/list?postUri=${encodeURIComponent(postUri)}`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to list reactions: ${response.statusText}`);
  }

  return response.json();
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
