// Atrarium PDS-First Architecture - AT Protocol Service
// PDS read/write operations and Bluesky integration

import { AtpAgent } from '@atproto/api';
import type { CommunityConfig, MembershipRecord, PDSRecordResult } from '../schemas/lexicon';
import {
  validateATUri,
  validateCommunityConfig,
  validateDID,
  validateMembershipRecord,
  validateModerationAction,
} from '../schemas/lexicon';
import type { Env } from '../types';

// ============================================================================
// AT Protocol Service
// ============================================================================

export class ATProtoService {
  private env: Env;
  private agent: AtpAgent | null = null;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Initialize AtpAgent and authenticate
   * @private
   */
  private async getAgent(): Promise<AtpAgent> {
    if (this.agent) {
      return this.agent;
    }

    const handle = this.env.BLUESKY_HANDLE;
    const password = this.env.BLUESKY_APP_PASSWORD;

    if (!handle || !password) {
      throw new Error('BLUESKY_HANDLE and BLUESKY_APP_PASSWORD environment variables required');
    }

    const agent = new AtpAgent({ service: 'https://bsky.social' });
    await agent.login({ identifier: handle, password });

    this.agent = agent;
    return agent;
  }

  // ============================================================================
  // PDS Write Operations (T018)
  // ============================================================================

  /**
   * Create CommunityConfig record in PDS
   * @param config Community configuration data
   * @returns Record creation result with URI, CID, rkey
   */
  async createCommunityConfig(config: unknown): Promise<PDSRecordResult> {
    // Validate against Lexicon schema
    const validated = validateCommunityConfig(config);

    const agent = await this.getAgent();

    // Create record in PDS using com.atproto.repo.createRecord
    const response = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did || '',
      collection: 'net.atrarium.community.config',
      record: validated,
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid,
      rkey: response.data.uri.split('/').pop() || '',
    };
  }

  /**
   * Create MembershipRecord in PDS
   * @param membership Membership data
   * @returns Record creation result
   */
  async createMembershipRecord(membership: unknown): Promise<PDSRecordResult> {
    // Validate against Lexicon schema
    const validated = validateMembershipRecord(membership);

    const agent = await this.getAgent();

    const response = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did || '',
      collection: 'net.atrarium.community.membership',
      record: validated,
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid,
      rkey: response.data.uri.split('/').pop() || '',
    };
  }

  /**
   * Create ModerationAction in PDS
   * @param action Moderation action data
   * @returns Record creation result
   */
  async createModerationAction(action: unknown): Promise<PDSRecordResult> {
    // Validate against Lexicon schema
    const validated = validateModerationAction(action);

    const agent = await this.getAgent();

    const response = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did || '',
      collection: 'net.atrarium.moderation.action',
      record: validated,
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid,
      rkey: response.data.uri.split('/').pop() || '',
    };
  }

  // ============================================================================
  // PDS Read Operations (T019)
  // ============================================================================

  /**
   * List membership records for a user DID
   * @param userDid User DID to query
   * @param options Query options
   * @returns Array of membership records
   */
  async listMemberships(
    userDid: string,
    options?: { activeOnly?: boolean }
  ): Promise<Array<MembershipRecord & { uri: string }>> {
    // Validate DID format
    validateDID(userDid);

    const agent = await this.getAgent();

    // Query PDS for membership records
    const response = await agent.com.atproto.repo.listRecords({
      repo: userDid,
      collection: 'net.atrarium.community.membership',
      limit: 100,
    });

    const memberships = response.data.records.map((record) => {
      const validated = validateMembershipRecord(record.value);
      return {
        ...validated,
        uri: record.uri,
      };
    });

    // Filter by active status if requested
    if (options?.activeOnly) {
      return memberships.filter((m) => m.active);
    }

    return memberships;
  }

  /**
   * Get single membership record by URI
   * @param membershipUri AT-URI of membership record
   * @returns Membership record
   */
  async getMembershipRecord(membershipUri: string): Promise<MembershipRecord & { uri: string }> {
    // Validate AT-URI format
    validateATUri(membershipUri);

    const agent = await this.getAgent();

    // Parse AT-URI to extract repo, collection, rkey
    const uriParts = membershipUri.replace('at://', '').split('/');
    if (uriParts.length !== 3) {
      throw new Error('Invalid AT-URI format');
    }

    const repo = uriParts[0];
    const collection = uriParts[1];
    const rkey = uriParts[2];

    if (!repo || !collection || !rkey) {
      throw new Error('Invalid AT-URI format');
    }

    // Fetch record from PDS
    const response = await agent.com.atproto.repo.getRecord({
      repo,
      collection,
      rkey,
    });

    if (!response.data.value) {
      throw new Error(`Membership record not found: ${membershipUri}`);
    }

    const validated = validateMembershipRecord(response.data.value);

    return {
      ...validated,
      uri: membershipUri,
    };
  }

  /**
   * Get community config by URI
   * @param communityUri AT-URI of community config
   * @returns Community config
   */
  async getCommunityConfig(communityUri: string): Promise<CommunityConfig & { uri: string }> {
    // Validate AT-URI format
    validateATUri(communityUri);

    const agent = await this.getAgent();

    // Parse AT-URI
    const uriParts = communityUri.replace('at://', '').split('/');
    if (uriParts.length !== 3) {
      throw new Error('Invalid AT-URI format');
    }

    const repo = uriParts[0];
    const collection = uriParts[1];
    const rkey = uriParts[2];

    if (!repo || !collection || !rkey) {
      throw new Error('Invalid AT-URI format');
    }

    // Fetch record from PDS
    const response = await agent.com.atproto.repo.getRecord({
      repo,
      collection,
      rkey,
    });

    if (!response.data.value) {
      throw new Error(`Community config not found: ${communityUri}`);
    }

    const validated = validateCommunityConfig(response.data.value);

    return {
      ...validated,
      uri: communityUri,
    };
  }

  /**
   * Query community config by hashtag
   * @param hashtag Community hashtag (e.g., #atrarium_a1b2c3d4)
   * @returns Community config if found, null otherwise
   */
  async queryCommunityByHashtag(
    hashtag: string
  ): Promise<(CommunityConfig & { uri: string }) | null> {
    const agent = await this.getAgent();
    // List all community.config records
    const response = await agent.com.atproto.repo.listRecords({
      repo: agent.session?.did || '',
      collection: 'net.atrarium.community.config',
      limit: 100,
    });

    // Find matching hashtag
    for (const record of response.data.records) {
      const validated = validateCommunityConfig(record.value);
      if (validated.hashtag === hashtag) {
        return {
          ...validated,
          uri: record.uri,
        };
      }
    }

    // No match found
    return null;
  }

  // ============================================================================
  // Legacy Methods (Phase 0 - kept for backward compatibility)
  // ============================================================================

  /**
   * Check if posts exist on Bluesky (for deletion sync)
   * @param uris Array of AT-URIs
   * @returns Array of URIs that no longer exist
   */
  async checkPostsExistence(_uris: string[]): Promise<string[]> {
    // Phase 0: Simplified implementation
    // In production: Use @atproto/api to query Bluesky AppView

    // For now, return empty array (assume all posts exist)
    // TODO: Implement actual Bluesky API calls
    return [];
  }

  /**
   * Fetch post metadata from Bluesky PDS
   * @param uri AT-URI
   * @returns Post metadata (text, media, langs, etc.)
   */
  async fetchPostMetadata(_uri: string): Promise<{
    text: string;
    hasMedia: boolean;
    langs: string[] | null;
  } | null> {
    // Phase 0: Simplified implementation
    // In production: Use @atproto/api to fetch post

    // For now, return mock data
    // TODO: Implement actual Bluesky API calls
    return {
      text: 'Mock post content',
      hasMedia: false,
      langs: ['en'],
    };
  }

  /**
   * Batch fetch post metadata
   */
  async fetchPostMetadataBatch(uris: string[]): Promise<
    Map<
      string,
      {
        text: string;
        hasMedia: boolean;
        langs: string[] | null;
      }
    >
  > {
    const results = new Map();

    // In production: Use @atproto/api batch operations
    for (const uri of uris) {
      const metadata = await this.fetchPostMetadata(uri);
      if (metadata) {
        results.set(uri, metadata);
      }
    }

    return results;
  }
}
