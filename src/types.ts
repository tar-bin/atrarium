// Atrarium MVP - TypeScript Type Definitions
// Based on data-model.md

// ============================================================================
// Cloudflare Workers Environment
// ============================================================================

export interface Env {
  DB: D1Database;
  POST_CACHE: KVNamespace;
  JWT_SECRET: string;
  BLUESKY_HANDLE?: string;
  BLUESKY_APP_PASSWORD?: string;
  ENVIRONMENT?: string;
}

// ============================================================================
// Database Entities
// ============================================================================

export type CommunityStage = 'theme' | 'community' | 'graduated';
export type ThemeFeedStatus = 'active' | 'warning' | 'archived';
export type MembershipRole = 'owner' | 'moderator' | 'member';
export type TransitionReason = 'deletion' | 'inactivity' | 'vacation' | 'manual';

export interface Community {
  id: string; // UUID v4
  name: string;
  description: string | null;
  stage: CommunityStage;
  parentId: string | null;
  feedMixOwn: number; // 0.0-1.0
  feedMixParent: number; // 0.0-1.0
  feedMixGlobal: number; // 0.0-1.0
  memberCount: number;
  postCount: number;
  createdAt: number; // Unix epoch (seconds)
  graduatedAt: number | null;
  archivedAt: number | null;
}

export interface ThemeFeed {
  id: string; // UUID v4
  communityId: string;
  name: string;
  description: string | null;
  status: ThemeFeedStatus;
  lastPostAt: number | null; // Unix epoch
  posts7d: number;
  activeUsers7d: number;
  createdAt: number; // Unix epoch
  archivedAt: number | null;
}

export interface Membership {
  communityId: string;
  userDid: string; // AT Protocol DID
  role: MembershipRole;
  joinedAt: number; // Unix epoch
  lastActivityAt: number | null;
}

export interface PostIndex {
  id: number; // AUTOINCREMENT
  uri: string; // AT-URI: at://did:plc:xxx/app.bsky.feed.post/yyy
  feedId: string;
  authorDid: string;
  createdAt: number; // Unix epoch
  hasMedia: boolean;
  langs: string[] | null; // BCP-47 language codes
}

export interface OwnerTransitionLog {
  id: number; // AUTOINCREMENT
  communityId: string;
  previousOwnerDid: string;
  newOwnerDid: string;
  reason: TransitionReason;
  transitionedAt: number; // Unix epoch
}

export interface Achievement {
  id: number; // AUTOINCREMENT
  userDid: string;
  achievementId: string; // e.g., 'first_join', 'first_split'
  communityId: string | null;
  unlockedAt: number; // Unix epoch
}

// ============================================================================
// Database Result Types (snake_case from D1)
// ============================================================================

export interface CommunityRow {
  id: string;
  name: string;
  description: string | null;
  stage: string;
  parent_id: string | null;
  feed_mix_own: number;
  feed_mix_parent: number;
  feed_mix_global: number;
  member_count: number;
  post_count: number;
  created_at: number;
  graduated_at: number | null;
  archived_at: number | null;
}

export interface ThemeFeedRow {
  id: string;
  community_id: string;
  name: string;
  description: string | null;
  status: string;
  last_post_at: number | null;
  posts_7d: number;
  active_users_7d: number;
  created_at: number;
  archived_at: number | null;
}

export interface MembershipRow {
  community_id: string;
  user_did: string;
  role: string;
  joined_at: number;
  last_activity_at: number | null;
}

export interface PostIndexRow {
  id: number;
  uri: string;
  feed_id: string;
  author_did: string;
  created_at: number;
  has_media: number; // 0 or 1 (SQLite boolean)
  langs: string | null; // JSON string
}

export interface OwnerTransitionLogRow {
  id: number;
  community_id: string;
  previous_owner_did: string;
  new_owner_did: string;
  reason: string;
  transitioned_at: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

// Auth
export interface LoginRequest {
  handle: string; // Bluesky handle or DID
}

export interface AuthResponse {
  accessJwt: string;
  refreshJwt: string;
  did: string;
  handle: string;
}

// Communities
export interface CreateCommunityRequest {
  name: string;
  description?: string;
  parentId?: string;
}

export interface CommunityResponse {
  id: string;
  name: string;
  description: string | null;
  stage: CommunityStage;
  parentId: string | null;
  memberCount: number;
  postCount: number;
  createdAt: number;
}

// Theme Feeds
export interface CreateThemeFeedRequest {
  name: string;
  description?: string;
}

export interface ThemeFeedResponse {
  id: string;
  communityId: string;
  name: string;
  description: string | null;
  status: ThemeFeedStatus;
  lastPostAt: number | null;
  posts7d: number;
  activeUsers7d: number;
  createdAt: number;
}

// Posts
export interface SubmitPostRequest {
  uri: string; // AT-URI
  feedId: string; // UUID
}

export interface PostIndexResponse {
  id: number;
  uri: string;
  feedId: string;
  authorDid: string;
  createdAt: number;
  hasMedia: boolean;
  langs: string[] | null;
}

// AT Protocol Feed Generator
export interface DIDDocument {
  '@context': string[];
  id: string; // did:web:example.com
  service: Array<{
    id: string; // #bsky_fg
    type: string; // BskyFeedGenerator
    serviceEndpoint: string; // https://example.com
  }>;
}

export interface FeedGeneratorDescription {
  did: string;
  feeds: Array<{
    uri: string; // at://did:web:example.com/app.bsky.feed.generator/feed-id
    displayName: string;
    description?: string;
  }>;
}

export interface FeedSkeleton {
  feed: Array<{
    post: string; // AT-URI
  }>;
  cursor?: string; // {timestamp}::{cid}
}

// ============================================================================
// JWT Payload Types
// ============================================================================

export interface DashboardJWTPayload {
  iss: string; // Issuer DID
  sub: string; // Subject DID
  aud: string; // Audience DID
  handle: string; // Bluesky handle
  iat: number; // Issued at (Unix epoch)
  exp: number; // Expiration (Unix epoch)
  jti: string; // JWT ID (nonce)
}

export interface ServiceJWTPayload {
  iss: string; // Issuer DID
  aud: string; // Audience DID
  exp: number; // Expiration
  iat: number; // Issued at
  jti: string; // JWT ID
  lxm: string; // Lexicon method (e.g., app.bsky.feed.getFeedSkeleton)
}

// ============================================================================
// Utility Types
// ============================================================================

export interface ErrorResponse {
  error: string;
  message: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  cursor?: string;
  total?: number;
}
