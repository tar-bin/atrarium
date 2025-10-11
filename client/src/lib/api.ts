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
// Custom Emoji API (018-api-orpc, T028)
// ============================================================================

/**
 * Emoji API is fully migrated to oRPC client with base64 approach.
 * Use apiClient.emoji directly for type-safe API calls:
 *
 * @example Upload emoji
 * import { fileToBase64, getImageDimensions, isAnimatedGif } from '@/lib/utils';
 *
 * const fileData = await fileToBase64(file);
 * const dimensions = await getImageDimensions(file);
 * const animated = await isAnimatedGif(file);
 *
 * const result = await apiClient.emoji.upload({
 *   fileData,
 *   mimeType: file.type,
 *   shortcode: 'party_parrot',
 *   size: file.size,
 *   dimensions,
 *   animated
 * });
 *
 * @example List user's emojis
 * const { emoji } = await apiClient.emoji.list({ did: 'did:plc:xxx' });
 *
 * @example Submit emoji for approval
 * await apiClient.emoji.submit({
 *   communityId: 'a1b2c3d4',
 *   emojiURI: 'at://did:plc:xxx/net.atrarium.emoji.custom/yyy'
 * });
 *
 * @example Approve emoji (owner only)
 * await apiClient.emoji.approve({
 *   communityId: 'a1b2c3d4',
 *   emojiURI: 'at://...',
 *   approve: true
 * });
 *
 * @example Get emoji registry
 * const { emoji } = await apiClient.emoji.registry({ communityId: 'a1b2c3d4' });
 */

/**
 * Upload custom emoji with base64 encoding
 * @deprecated Use apiClient.emoji.upload() with fileToBase64/getImageDimensions utilities.
 * This helper is kept for backward compatibility during migration.
 */
export async function uploadEmoji(
  shortcode: string,
  image: File
): Promise<{ emojiURI: string; blob: unknown }> {
  // Import utilities dynamically to avoid circular dependencies
  const { fileToBase64, getImageDimensions, isAnimatedGif } = await import('./utils');

  // Convert File to base64
  const fileData = await fileToBase64(image);
  const dimensions = await getImageDimensions(image);
  const animated = await isAnimatedGif(image);

  // Call oRPC endpoint
  const result = await apiClient.emoji.upload({
    fileData,
    mimeType: image.type as 'image/png' | 'image/gif' | 'image/webp',
    shortcode,
    size: image.size,
    dimensions,
    animated,
  });

  return result;
}

/**
 * @deprecated Legacy endpoint removed. Emoji deletion not supported in oRPC API.
 * Consider implementing revoke functionality via apiClient.emoji.revoke() instead.
 */
export async function deleteEmoji(_emojiUri: string): Promise<{ success: boolean }> {
  throw new Error('deleteEmoji is no longer supported. Use apiClient.emoji.revoke() instead.');
}

/**
 * List approved emojis for a community (registry)
 * @deprecated Use apiClient.emoji.registry({ communityId }) instead.
 */
export async function listEmojis(communityId: string): Promise<{
  emoji: Record<
    string,
    {
      emojiURI: string;
      blobURI: string;
      animated: boolean;
    }
  >;
}> {
  return await apiClient.emoji.registry({ communityId });
}

/**
 * List user's uploaded emojis
 * @deprecated Use apiClient.emoji.list({ did }) instead.
 */
export async function listUserEmojis(userId: string): Promise<{
  emoji: Array<{
    shortcode: string;
    blob: unknown;
    creator: string;
    uploadedAt: string;
    format: 'png' | 'gif' | 'webp';
    size: number;
    dimensions: { width: number; height: number };
    animated: boolean;
    uri: string;
  }>;
}> {
  return await apiClient.emoji.list({ did: userId });
}

/**
 * List pending emojis for approval (owner only)
 * @deprecated Use apiClient.emoji.listPending({ communityId }) instead.
 */
export async function listPendingEmojis(communityId: string): Promise<{
  submissions: Array<{
    emojiUri: string;
    shortcode: string;
    creator: string;
    creatorHandle: string;
    uploadedAt: string;
    format: 'png' | 'gif' | 'webp';
    animated: boolean;
    blobUrl: string;
  }>;
}> {
  return await apiClient.emoji.listPending({ communityId });
}

/**
 * Approve or reject custom emoji (owner only)
 * @deprecated Use apiClient.emoji.approve() instead.
 */
export async function approveEmoji(
  communityId: string,
  emojiURI: string,
  approve: boolean,
  reason?: string
): Promise<{ approvalURI: string; status: 'approved' | 'rejected' }> {
  return await apiClient.emoji.approve({
    communityId,
    emojiURI,
    approve,
    reason,
  });
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
