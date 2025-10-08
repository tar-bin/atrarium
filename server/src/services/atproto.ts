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
   * Create MembershipRecord in PDS (T020)
   * @param membership Membership data
   * @param userDid Target user's DID (to create record in their PDS)
   * @returns Record creation result
   */
  async createMembershipRecord(membership: unknown, userDid: string): Promise<PDSRecordResult> {
    // Validate against Lexicon schema
    const validated = validateMembershipRecord(membership);

    const agent = await this.getAgent();

    // Create membership record in target user's PDS
    const response = await agent.com.atproto.repo.createRecord({
      repo: userDid, // Write to user's PDS
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
   * Delete (deactivate) MembershipRecord in PDS (T021)
   * @param membershipUri AT-URI of membership record
   * @returns Updated membership record with active=false
   */
  async deleteMembershipRecord(membershipUri: string): Promise<MembershipRecord & { uri: string }> {
    // Validate AT-URI format
    validateATUri(membershipUri);

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

    const agent = await this.getAgent();

    // Get current record
    const getResponse = await agent.com.atproto.repo.getRecord({
      repo,
      collection,
      rkey,
    });

    if (!getResponse.data.value) {
      throw new Error(`Membership record not found: ${membershipUri}`);
    }

    const currentRecord = validateMembershipRecord(getResponse.data.value);

    // Update record with active=false (soft delete)
    const updatedRecord = {
      ...currentRecord,
      active: false,
    };

    await agent.com.atproto.repo.putRecord({
      repo,
      collection,
      rkey,
      record: updatedRecord,
    });

    return {
      ...updatedRecord,
      uri: membershipUri,
    };
  }

  /**
   * Create ModerationAction in PDS (T023)
   * @param action Moderation action data
   * @param moderatorDid DID of moderator (to create record in their PDS)
   * @returns Record creation result
   */
  async createModerationAction(action: unknown, moderatorDid: string): Promise<PDSRecordResult> {
    // Validate against Lexicon schema
    const validated = validateModerationAction(action);

    const agent = await this.getAgent();

    // Create moderation action record in moderator's PDS
    const response = await agent.com.atproto.repo.createRecord({
      repo: moderatorDid, // Write to moderator's PDS
      collection: 'net.atrarium.moderation.action',
      record: validated,
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid,
      rkey: response.data.uri.split('/').pop() || '',
    };
  }

  /**
   * List moderation actions for a community (T024)
   * @param communityUri AT-URI of community config
   * @param moderatorDid DID of moderator (to query their PDS)
   * @returns Array of moderation actions
   */
  async listModerationActions(
    communityUri: string,
    moderatorDid: string
  ): Promise<
    Array<{
      uri: string;
      action: 'hide_post' | 'unhide_post' | 'block_user' | 'unblock_user';
      target: { uri: string; cid: string } | { did: string };
      community: string;
      reason?: string;
      createdAt: string;
    }>
  > {
    // Validate inputs
    validateATUri(communityUri);
    validateDID(moderatorDid);

    const agent = await this.getAgent();

    // Query moderator's PDS for moderation actions
    const response = await agent.com.atproto.repo.listRecords({
      repo: moderatorDid,
      collection: 'net.atrarium.moderation.action',
      limit: 100,
    });

    // Filter by community and map to output format
    const actions = response.data.records
      .map((record) => {
        const validated = validateModerationAction(record.value);
        return {
          uri: record.uri,
          action: validated.action,
          target: validated.target,
          community: validated.community,
          reason: validated.reason,
          createdAt: validated.createdAt,
        };
      })
      .filter((action) => action.community === communityUri);

    return actions;
  }

  /**
   * Update membership record in PDS (T023-T024 - for role changes, status changes)
   * @param membershipUri AT-URI of membership record
   * @param updates Partial updates to apply
   * @returns Updated membership record
   */
  async updateMembershipRecord(
    membershipUri: string,
    updates: Partial<{
      role: 'owner' | 'moderator' | 'member';
      status: 'active' | 'pending';
      customTitle: string;
    }>
  ): Promise<MembershipRecord & { uri: string }> {
    // Validate AT-URI format
    validateATUri(membershipUri);

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

    const agent = await this.getAgent();

    // Get current record
    const getResponse = await agent.com.atproto.repo.getRecord({
      repo,
      collection,
      rkey,
    });

    if (!getResponse.data.value) {
      throw new Error(`Membership record not found: ${membershipUri}`);
    }

    const currentRecord = validateMembershipRecord(getResponse.data.value);

    // Apply updates
    const updatedRecord = {
      ...currentRecord,
      ...updates,
    };

    // Write updated record back to PDS
    await agent.com.atproto.repo.putRecord({
      repo,
      collection,
      rkey,
      record: updatedRecord,
    });

    return {
      ...updatedRecord,
      uri: membershipUri,
    };
  }

  /**
   * Transfer community ownership (T025)
   * Updates two membership records: old owner → member, new member → owner
   * @param oldOwnerMembershipUri AT-URI of current owner's membership record
   * @param newOwnerMembershipUri AT-URI of new owner's membership record
   * @returns Both updated membership records
   */
  async transferOwnership(
    oldOwnerMembershipUri: string,
    newOwnerMembershipUri: string
  ): Promise<{
    oldOwner: MembershipRecord & { uri: string };
    newOwner: MembershipRecord & { uri: string };
  }> {
    // Validate both URIs
    validateATUri(oldOwnerMembershipUri);
    validateATUri(newOwnerMembershipUri);

    // Update old owner: owner → member
    const oldOwner = await this.updateMembershipRecord(oldOwnerMembershipUri, {
      role: 'member',
    });

    // Update new owner: member → owner
    const newOwner = await this.updateMembershipRecord(newOwnerMembershipUri, {
      role: 'owner',
    });

    return { oldOwner, newOwner };
  }

  /**
   * Get community statistics from PDS (T028)
   * Counts memberships: memberCount = status='active' AND active=true,
   * pendingRequestCount = status='pending'
   * @param communityUri AT-URI of community config
   * @returns Community statistics (PDS-feasible metrics only)
   */
  async getCommunityStats(communityUri: string): Promise<{
    memberCount: number;
    pendingRequestCount: number;
  }> {
    // Validate community URI
    validateATUri(communityUri);

    // Parse community URI to extract owner DID
    const uriParts = communityUri.replace('at://', '').split('/');
    if (uriParts.length !== 3) {
      throw new Error('Invalid AT-URI format');
    }

    const ownerDid = uriParts[0];

    if (!ownerDid) {
      throw new Error('Invalid community URI: missing DID');
    }

    const agent = await this.getAgent();

    // Query all membership records from community (stored in members' PDSs)
    // NOTE: This is a limitation - we can only query the authenticated user's PDS
    // In production, would need to query all members' PDSs or use indexer
    // For now, query owner's PDS and count memberships pointing to this community
    const response = await agent.com.atproto.repo.listRecords({
      repo: ownerDid,
      collection: 'net.atrarium.community.membership',
      limit: 100,
    });

    const memberships = response.data.records
      .map((record) => validateMembershipRecord(record.value))
      .filter((m) => m.community === communityUri);

    // Count active members (status='active' AND active=true)
    const memberCount = memberships.filter((m) => m.status === 'active' && m.active).length;

    // Count pending join requests (status='pending')
    const pendingRequestCount = memberships.filter((m) => m.status === 'pending').length;

    return {
      memberCount,
      pendingRequestCount,
    };
  }

  // ============================================================================
  // PDS Read Operations (T019)
  // ============================================================================

  /**
   * List membership records for a user DID (T022 - enhanced with status filter)
   * @param userDid User DID to query
   * @param options Query options
   * @returns Array of membership records
   */
  async listMemberships(
    userDid: string,
    options?: {
      activeOnly?: boolean;
      status?: 'active' | 'pending' | 'all';
      communityUri?: string;
    }
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

    let memberships = response.data.records.map((record) => {
      const validated = validateMembershipRecord(record.value);
      return {
        ...validated,
        uri: record.uri,
      };
    });

    // Filter by community if specified
    if (options?.communityUri) {
      memberships = memberships.filter((m) => m.community === options.communityUri);
    }

    // Filter by active status (backward compatibility)
    if (options?.activeOnly) {
      memberships = memberships.filter((m) => m.active);
    }

    // Filter by status field (new in T022)
    if (options?.status && options.status !== 'all') {
      memberships = memberships.filter((m) => m.status === options.status);
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
   * Query community config by hashtag (T026)
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

  /**
   * Update community config in PDS (T027)
   * @param communityUri AT-URI of community config
   * @param updates Partial updates to apply
   * @returns Updated community config
   */
  async updateCommunityConfig(
    communityUri: string,
    updates: Partial<{
      name: string;
      description: string;
      accessType: 'open' | 'invite-only';
      moderators: string[];
      blocklist: string[];
      feedMix: {
        own: number;
        parent: number;
        global: number;
      };
    }>
  ): Promise<CommunityConfig & { uri: string }> {
    // Validate AT-URI format
    validateATUri(communityUri);

    // Parse AT-URI to extract repo, collection, rkey
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

    const agent = await this.getAgent();

    // Get current record
    const getResponse = await agent.com.atproto.repo.getRecord({
      repo,
      collection,
      rkey,
    });

    if (!getResponse.data.value) {
      throw new Error(`Community config not found: ${communityUri}`);
    }

    const currentConfig = validateCommunityConfig(getResponse.data.value);

    // Apply updates and set updatedAt timestamp
    const updatedConfig = {
      ...currentConfig,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Write updated record back to PDS
    await agent.com.atproto.repo.putRecord({
      repo,
      collection,
      rkey,
      record: updatedConfig,
    });

    return {
      ...updatedConfig,
      uri: communityUri,
    };
  }

  /**
   * List all communities owned by a DID (T028)
   * @param ownerDid DID of community owner
   * @returns Array of community configs
   */
  async listCommunitiesByOwner(
    ownerDid: string
  ): Promise<Array<CommunityConfig & { uri: string }>> {
    // Validate DID format
    validateDID(ownerDid);

    const agent = await this.getAgent();

    // Query owner's PDS for community configs
    const response = await agent.com.atproto.repo.listRecords({
      repo: ownerDid,
      collection: 'net.atrarium.community.config',
      limit: 100,
    });

    return response.data.records.map((record) => {
      const validated = validateCommunityConfig(record.value);
      return {
        ...validated,
        uri: record.uri,
      };
    });
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
