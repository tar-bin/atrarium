/**
 * Reactions API Contract
 *
 * oRPC type-safe API contract for emoji reactions feature.
 * This contract defines request/response schemas and route signatures.
 * Server implements handlers, client gets full type safety.
 */

import { z } from 'zod';

// ============================================================================
// Shared Schemas
// ============================================================================

/**
 * Emoji identifier (Unicode or custom)
 */
export const emojiSchema = z.object({
  type: z.enum(['unicode', 'custom']),
  value: z.string().min(1).max(128), // Unicode codepoint or shortcode
});

export type Emoji = z.infer<typeof emojiSchema>;

/**
 * Reaction record (matches Lexicon schema)
 */
export const reactionSchema = z.object({
  reactorDid: z.string().startsWith('did:'),
  postUri: z.string().startsWith('at://'),
  emoji: emojiSchema,
  communityId: z.string(),
  createdAt: z.string().datetime(),
});

export type Reaction = z.infer<typeof reactionSchema>;

/**
 * Reaction aggregate (cached counts)
 */
export const reactionAggregateSchema = z.object({
  postUri: z.string().startsWith('at://'),
  emoji: emojiSchema,
  count: z.number().int().min(0),
  currentUserReacted: z.boolean(),
  reactorDids: z.array(z.string().startsWith('did:')),
});

export type ReactionAggregate = z.infer<typeof reactionAggregateSchema>;

// ============================================================================
// Reaction Endpoints
// ============================================================================

/**
 * POST /api/reactions/add
 *
 * Add emoji reaction to post. Toggle behavior if already reacted.
 */
export const addReactionRequest = z.object({
  postUri: z.string().startsWith('at://'),
  emoji: emojiSchema,
  communityId: z.string(),
});

export const addReactionResponse = z.object({
  success: z.boolean(),
  reactionUri: z.string().optional(), // AT Protocol URI of created reaction record
});

/**
 * DELETE /api/reactions/remove
 *
 * Remove user's emoji reaction from post.
 */
export const removeReactionRequest = z.object({
  postUri: z.string().startsWith('at://'),
  emoji: emojiSchema,
});

export const removeReactionResponse = z.object({
  success: z.boolean(),
});

/**
 * GET /api/reactions/list
 *
 * List all reactions for a post (aggregated by emoji).
 */
export const listReactionsRequest = z.object({
  postUri: z.string().startsWith('at://'),
  limit: z.number().int().min(1).max(100).optional().default(50),
});

export const listReactionsResponse = z.object({
  reactions: z.array(reactionAggregateSchema),
  totalCount: z.number().int().min(0),
});

/**
 * GET /api/reactions/stream (Server-Sent Events)
 *
 * Real-time reaction updates for a community.
 * Returns SSE stream with reaction_update events.
 */
export const streamReactionsRequest = z.object({
  communityId: z.string(),
});

// SSE message format (not validated by oRPC, for documentation)
export const reactionUpdateEvent = z.object({
  event: z.literal('reaction_update'),
  data: reactionAggregateSchema,
});

// ============================================================================
// Custom Emoji Endpoints
// ============================================================================

/**
 * CustomEmoji record (matches Lexicon schema)
 */
export const customEmojiSchema = z.object({
  shortcode: z.string().regex(/^[a-zA-Z0-9_]{2,32}$/),
  imageBlobCid: z.string(), // AT Protocol blob CID
  imageUrl: z.string().url().optional(), // Resolved blob URL (for client display)
  communityId: z.string(),
  createdBy: z.string().startsWith('did:'),
  createdAt: z.string().datetime(),
  approvalStatus: z.enum(['pending', 'approved', 'rejected', 'revoked']),
  approvedBy: z.string().startsWith('did:').optional(),
  approvedAt: z.string().datetime().optional(),
  rejectionReason: z.string().optional(),
});

export type CustomEmoji = z.infer<typeof customEmojiSchema>;

/**
 * POST /api/emoji/upload
 *
 * Upload custom emoji image (multipart/form-data).
 * Note: oRPC does not handle file uploads directly. Use FormData on client.
 */
export const uploadEmojiRequest = z.object({
  shortcode: z.string().regex(/^[a-zA-Z0-9_]{2,32}$/),
  communityId: z.string(),
  // File uploaded via FormData (not validated by Zod)
});

export const uploadEmojiResponse = z.object({
  success: z.boolean(),
  emojiUri: z.string(), // AT Protocol URI of created emoji record
  customEmoji: customEmojiSchema,
});

/**
 * DELETE /api/emoji/delete
 *
 * Delete custom emoji (owner or creator only).
 */
export const deleteEmojiRequest = z.object({
  emojiUri: z.string().startsWith('at://'),
});

export const deleteEmojiResponse = z.object({
  success: z.boolean(),
});

/**
 * GET /api/emoji/list
 *
 * List approved custom emojis for a community.
 */
export const listEmojisRequest = z.object({
  communityId: z.string(),
});

export const listEmojisResponse = z.object({
  emojis: z.array(customEmojiSchema),
});

/**
 * GET /api/emoji/list-user
 *
 * List user's uploaded emojis (all statuses).
 */
export const listUserEmojisRequest = z.object({
  userId: z.string().startsWith('did:'),
});

export const listUserEmojisResponse = z.object({
  emojis: z.array(customEmojiSchema),
});

/**
 * GET /api/emoji/list-pending
 *
 * List pending emojis for approval (owner/moderator only).
 */
export const listPendingEmojisRequest = z.object({
  communityId: z.string(),
});

export const listPendingEmojisResponse = z.object({
  emojis: z.array(customEmojiSchema),
});

/**
 * POST /api/emoji/approve
 *
 * Approve or reject custom emoji (owner/moderator only).
 */
export const approveEmojiRequest = z.object({
  communityId: z.string(),
  emojiRef: z.string().startsWith('at://'), // Emoji record URI
  status: z.enum(['approved', 'rejected', 'revoked']),
  reason: z.string().optional(), // Required for rejection
});

export const approveEmojiResponse = z.object({
  success: z.boolean(),
  approvalUri: z.string(), // AT Protocol URI of updated emoji record
});

// ============================================================================
// Error Responses
// ============================================================================

/**
 * Rate limit error (429 Too Many Requests)
 */
export const rateLimitError = z.object({
  error: z.literal('RATE_LIMIT_EXCEEDED'),
  message: z.string(),
  retryAfter: z.number().int().min(0), // Seconds until retry allowed
});

/**
 * Validation error (400 Bad Request)
 */
export const validationError = z.object({
  error: z.literal('VALIDATION_ERROR'),
  message: z.string(),
  field: z.string().optional(),
});

/**
 * Authorization error (403 Forbidden)
 */
export const authorizationError = z.object({
  error: z.literal('FORBIDDEN'),
  message: z.string(),
});

/**
 * Not found error (404 Not Found)
 */
export const notFoundError = z.object({
  error: z.literal('NOT_FOUND'),
  message: z.string(),
});

// ============================================================================
// Route Contract (for oRPC integration)
// ============================================================================

/**
 * Example oRPC router contract (to be integrated into shared/contracts/src/router.ts)
 */
export const reactionsRouteContract = {
  reactions: {
    add: {
      input: addReactionRequest,
      output: addReactionResponse,
    },
    remove: {
      input: removeReactionRequest,
      output: removeReactionResponse,
    },
    list: {
      input: listReactionsRequest,
      output: listReactionsResponse,
    },
    stream: {
      input: streamReactionsRequest,
      // SSE stream (no output schema, handled by Hono)
    },
  },
  emoji: {
    upload: {
      input: uploadEmojiRequest,
      output: uploadEmojiResponse,
    },
    delete: {
      input: deleteEmojiRequest,
      output: deleteEmojiResponse,
    },
    list: {
      input: listEmojisRequest,
      output: listEmojisResponse,
    },
    listUser: {
      input: listUserEmojisRequest,
      output: listUserEmojisResponse,
    },
    listPending: {
      input: listPendingEmojisRequest,
      output: listPendingEmojisResponse,
    },
    approve: {
      input: approveEmojiRequest,
      output: approveEmojiResponse,
    },
  },
};

// Type exports for server/client use
export type AddReactionRequest = z.infer<typeof addReactionRequest>;
export type AddReactionResponse = z.infer<typeof addReactionResponse>;
export type RemoveReactionRequest = z.infer<typeof removeReactionRequest>;
export type RemoveReactionResponse = z.infer<typeof removeReactionResponse>;
export type ListReactionsRequest = z.infer<typeof listReactionsRequest>;
export type ListReactionsResponse = z.infer<typeof listReactionsResponse>;

export type UploadEmojiRequest = z.infer<typeof uploadEmojiRequest>;
export type UploadEmojiResponse = z.infer<typeof uploadEmojiResponse>;
export type DeleteEmojiRequest = z.infer<typeof deleteEmojiRequest>;
export type DeleteEmojiResponse = z.infer<typeof deleteEmojiResponse>;
export type ListEmojisRequest = z.infer<typeof listEmojisRequest>;
export type ListEmojisResponse = z.infer<typeof listEmojisResponse>;
export type ListUserEmojisRequest = z.infer<typeof listUserEmojisRequest>;
export type ListUserEmojisResponse = z.infer<typeof listUserEmojisResponse>;
export type ListPendingEmojisRequest = z.infer<typeof listPendingEmojisRequest>;
export type ListPendingEmojisResponse = z.infer<typeof listPendingEmojisResponse>;
export type ApproveEmojiRequest = z.infer<typeof approveEmojiRequest>;
export type ApproveEmojiResponse = z.infer<typeof approveEmojiResponse>;

export type RateLimitError = z.infer<typeof rateLimitError>;
export type ValidationError = z.infer<typeof validationError>;
export type AuthorizationError = z.infer<typeof authorizationError>;
export type NotFoundError = z.infer<typeof notFoundError>;
