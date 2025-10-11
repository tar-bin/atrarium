// Atrarium PDS-First Architecture - AT Protocol Service
// PDS read/write operations and Bluesky integration

import { AtpAgent } from '@atproto/api';
import type {
  BlobRef,
  CommunityConfig,
  CustomEmoji,
  EmojiApproval,
  EmojiReference,
  MembershipRecord,
  PDSRecordResult,
  Reaction,
} from '../schemas/lexicon';
import {
  validateATUri,
  validateCommunityConfig,
  validateCommunityPost,
  validateCustomEmoji,
  validateDID,
  validateEmojiApproval,
  validateMembershipRecord,
  validateModerationAction,
  validateReaction,
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
   */
  async getAgent(): Promise<AtpAgent> {
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
      collection: 'net.atrarium.group.config',
      record: validated,
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid,
      rkey: response.data.uri.split('/').pop() || '',
    };
  }

  /**
   * Create CommunityPost record in PDS (014-bluesky)
   * @param post Post data (text, communityId, createdAt)
   * @param userDid Target user's DID (to create record in their PDS)
   * @returns Record creation result
   */
  async createCommunityPost(post: unknown, userDid: string): Promise<PDSRecordResult> {
    // Validate against Lexicon schema
    const validated = validateCommunityPost(post);

    const agent = await this.getAgent();

    // Create post record in user's PDS
    const response = await agent.com.atproto.repo.createRecord({
      repo: userDid, // Write to user's PDS
      collection: 'net.atrarium.group.post',
      record: validated,
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid,
      rkey: response.data.uri.split('/').pop() || '',
    };
  }

  // ============================================================================
  // PDS Emoji Operations (015-markdown-pds: T007-T012)
  // ============================================================================

  /**
   * Upload emoji blob to PDS (T007, updated for base64 support - 018-api-orpc)
   * @param agent AtpAgent instance
   * @param fileData base64-encoded image data
   * @param mimeType Image MIME type
   * @param size File size in bytes
   * @returns BlobRef with CID and metadata
   */
  async uploadEmojiBlob(
    agent: AtpAgent,
    fileData: string,
    mimeType: string,
    size: number
  ): Promise<BlobRef> {
    // Validate file size (max 500KB = 512000 bytes)
    if (size > 512000) {
      throw new Error('File size exceeds 500KB limit');
    }

    // Validate MIME type
    const allowedTypes = ['image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(mimeType)) {
      throw new Error(`Unsupported format: ${mimeType}. Allowed: PNG, GIF, WEBP`);
    }

    // Convert base64 to Uint8Array
    // Decode base64 string to binary
    const binaryString = atob(fileData);
    const uint8Array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i);
    }

    // Upload blob to PDS
    const response = await agent.uploadBlob(uint8Array, {
      encoding: mimeType,
    });

    return {
      $type: 'blob',
      ref: { $link: response.data.blob.ref.toString() },
      mimeType: response.data.blob.mimeType,
      size: response.data.blob.size,
    };
  }

  /**
   * Create CustomEmoji record in PDS (T008)
   * @param agent AtpAgent instance
   * @param shortcode Emoji shortcode (lowercase alphanumeric + underscores)
   * @param blob BlobRef from uploadEmojiBlob
   * @param format Image format (png, gif, webp)
   * @param size File size in bytes
   * @param dimensions Image dimensions { width, height }
   * @param animated True for animated GIFs
   * @returns Record creation result
   */
  async createCustomEmoji(
    agent: AtpAgent,
    shortcode: string,
    blob: BlobRef,
    format: 'png' | 'gif' | 'webp',
    size: number,
    dimensions: { width: number; height: number },
    animated: boolean
  ): Promise<PDSRecordResult> {
    const emojiRecord: CustomEmoji = {
      $type: 'net.atrarium.emoji.custom',
      shortcode,
      blob,
      creator: agent.session?.did || '',
      uploadedAt: new Date().toISOString(),
      format,
      size,
      dimensions,
      animated,
    };

    // Validate against Lexicon schema
    const validated = validateCustomEmoji(emojiRecord);

    // Create record in user's PDS
    const response = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did || '',
      collection: 'net.atrarium.emoji.custom',
      record: validated,
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid,
      rkey: response.data.uri.split('/').pop() || '',
    };
  }

  /**
   * Create EmojiApproval record in PDS (T009)
   * @param agent AtpAgent instance
   * @param shortcode Emoji shortcode to register in community namespace
   * @param emojiRef AT-URI of CustomEmoji record
   * @param communityId Community ID (8-char hex)
   * @param status Approval status (approved, rejected, revoked)
   * @param reason Optional rejection/revocation reason
   * @returns Record creation result
   */
  async createEmojiApproval(
    agent: AtpAgent,
    shortcode: string,
    emojiRef: string,
    communityId: string,
    status: 'approved' | 'rejected' | 'revoked',
    reason?: string
  ): Promise<PDSRecordResult> {
    const approvalRecord: EmojiApproval = {
      $type: 'net.atrarium.emoji.approval',
      shortcode,
      emojiRef,
      communityId,
      status,
      approver: agent.session?.did || '',
      decidedAt: new Date().toISOString(),
      reason,
    };

    // Validate against Lexicon schema
    const validated = validateEmojiApproval(approvalRecord);

    // Create record in community owner's PDS
    const response = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did || '',
      collection: 'net.atrarium.emoji.approval',
      record: validated,
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid,
      rkey: response.data.uri.split('/').pop() || '',
    };
  }

  /**
   * List user's custom emoji from PDS (T010)
   * @param agent AtpAgent instance
   * @param did User DID to query
   * @returns Array of CustomEmoji records
   */
  async listUserEmoji(agent: AtpAgent, did: string): Promise<Array<CustomEmoji & { uri: string }>> {
    // Validate DID format
    validateDID(did);

    // Query PDS for custom emoji records
    const response = await agent.com.atproto.repo.listRecords({
      repo: did,
      collection: 'net.atrarium.emoji.custom',
      limit: 100,
    });

    return response.data.records.map((record) => {
      const validated = validateCustomEmoji(record.value);
      return {
        ...validated,
        uri: record.uri,
      };
    });
  }

  /**
   * List community emoji approvals from PDS (T011)
   * @param agent AtpAgent instance
   * @param communityId Community ID (8-char hex)
   * @param statusFilter Optional filter by status (approved, rejected, revoked)
   * @returns Array of EmojiApproval records
   */
  async listCommunityApprovals(
    agent: AtpAgent,
    communityId: string,
    statusFilter?: 'approved' | 'rejected' | 'revoked'
  ): Promise<Array<EmojiApproval & { uri: string }>> {
    // Validate community ID format
    if (!/^[0-9a-f]{8}$/.test(communityId)) {
      throw new Error('Invalid community ID format (must be 8-char hex)');
    }

    // Query community owner's PDS for approval records
    const response = await agent.com.atproto.repo.listRecords({
      repo: agent.session?.did || '',
      collection: 'net.atrarium.emoji.approval',
      limit: 100,
    });

    let approvals = response.data.records
      .map((record) => {
        const validated = validateEmojiApproval(record.value);
        return {
          ...validated,
          uri: record.uri,
        };
      })
      .filter((approval) => approval.communityId === communityId);

    // Filter by status if specified
    if (statusFilter) {
      approvals = approvals.filter((approval) => approval.status === statusFilter);
    }

    return approvals;
  }

  /**
   * Get user profile from Bluesky (014-bluesky)
   * @param actor User DID or handle
   * @returns Profile data (did, handle, displayName, avatar)
   */
  async getProfile(actor: string): Promise<{
    did: string;
    handle: string;
    displayName: string | null;
    avatar: string | null;
  }> {
    const agent = await this.getAgent();

    const response = await agent.app.bsky.actor.getProfile({ actor });

    return {
      did: response.data.did,
      handle: response.data.handle,
      displayName: response.data.displayName || null,
      avatar: response.data.avatar || null,
    };
  }

  /**
   * Get multiple user profiles from Bluesky (014-bluesky)
   * @param actors Array of DIDs or handles
   * @returns Array of profile data
   */
  async getProfiles(actors: string[]): Promise<
    Array<{
      did: string;
      handle: string;
      displayName: string | null;
      avatar: string | null;
    }>
  > {
    const agent = await this.getAgent();

    const response = await agent.app.bsky.actor.getProfiles({ actors });

    return response.data.profiles.map((profile) => ({
      did: profile.did,
      handle: profile.handle,
      displayName: profile.displayName || null,
      avatar: profile.avatar || null,
    }));
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
      collection: 'net.atrarium.group.membership',
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
      collection: 'net.atrarium.group.membership',
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
      collection: 'net.atrarium.group.membership',
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
      collection: 'net.atrarium.group.config',
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
      collection: 'net.atrarium.group.config',
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

  // ============================================================================
  // Reaction Operations (016-slack-mastodon-misskey, T016)
  // ============================================================================

  /**
   * Create Reaction record in PDS
   * @param postUri AT-URI of post being reacted to
   * @param emoji Emoji reference (Unicode or custom)
   * @param communityId Community ID (8-character hex)
   * @returns Record creation result with URI, CID, rkey
   */
  async createReaction(
    postUri: string,
    emoji: EmojiReference,
    communityId: string
  ): Promise<PDSRecordResult> {
    const agent = await this.getAgent();

    const reactionRecord: Reaction = {
      $type: 'net.atrarium.group.reaction',
      postUri,
      emoji,
      communityId,
      createdAt: new Date().toISOString(),
    };

    // Validate against Lexicon schema
    const validated = validateReaction(reactionRecord);

    // Create record in user's PDS
    const response = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did || '',
      collection: 'net.atrarium.group.reaction',
      record: validated,
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid,
      rkey: response.data.uri.split('/').pop() || '',
    };
  }

  /**
   * Delete Reaction record from PDS
   * @param reactionUri AT-URI of reaction record
   * @returns True if deletion successful
   */
  async deleteReaction(reactionUri: string): Promise<boolean> {
    // Validate AT-URI format
    validateATUri(reactionUri);

    const agent = await this.getAgent();

    // Parse AT-URI: at://did:plc:xxx/net.atrarium.group.reaction/rkey
    const parts = reactionUri.split('/');
    const rkey = parts.pop() || '';
    const collection = parts.pop() || '';
    const did = parts.slice(2).join('/'); // Reconstruct DID

    if (collection !== 'net.atrarium.group.reaction') {
      throw new Error('Invalid reaction URI: must be net.atrarium.group.reaction collection');
    }

    // Delete record from PDS
    await agent.com.atproto.repo.deleteRecord({
      repo: did,
      collection: 'net.atrarium.group.reaction',
      rkey,
    });

    return true;
  }

  /**
   * List reactions for a post from PDS
   * @param postUri AT-URI of post
   * @param limit Maximum number of results (default 50)
   * @param cursor Pagination cursor
   * @returns Array of Reaction records with URIs
   */
  async listReactions(
    postUri: string,
    _limit = 50,
    _cursor?: string
  ): Promise<{
    reactions: Array<Reaction & { uri: string; reactor: string }>;
    cursor?: string;
  }> {
    // Validate post URI
    validateATUri(postUri);

    // In production: Query PDS for reactions using listRecords with filter
    // For MVP: Return empty array (reactions will be cached in Durable Objects)
    // TODO: Implement PDS query when AT Protocol supports record filtering

    return {
      reactions: [],
      cursor: undefined,
    };
  }

  // ============================================================================
  // Hierarchical Group System Methods (017-1-1, T015-T020)
  // ============================================================================

  /**
   * Create child Theme group under Graduated parent
   * @param parentId Parent group ID or AT-URI
   * @param name Child group name
   * @param description Optional child group description
   * @param feedMix Optional feed mix configuration
   * @returns Created child group config with parent AT-URI
   */
  async createChildGroup(
    parentId: string,
    name: string,
    description?: string,
    feedMix?: { own: number; parent: number; global: number }
  ): Promise<CommunityConfig & { uri: string; cid: string; rkey: string }> {
    const agent = await this.getAgent();

    // Step 1: Query parent group from PDS (validate stage === 'graduated')
    const parentConfig = await this.getCommunityConfig(parentId);

    if (!parentConfig) {
      throw new Error(`Parent group not found: ${parentId}`);
    }

    if (parentConfig.stage !== 'graduated') {
      throw new Error(
        `Only Graduated-stage groups can have children. Parent stage: ${parentConfig.stage}`
      );
    }

    // Validate parent cannot have its own parent (max depth 1 level)
    if (parentConfig.parentCommunity) {
      throw new Error('Parent group cannot have its own parent (max hierarchy depth is 1 level)');
    }

    // Step 2: Generate child group hashtag
    const hashtag = `#atr_${Math.random().toString(16).substring(2, 10)}`;

    // Step 3: Construct parent AT-URI
    // Format: at://did:plc:xxx/net.atrarium.group.config/rkey
    const parentAtUri = `at://${agent.session?.did}/net.atrarium.group.config/${parentId}`;

    // Step 4: Create child record with stage='theme' and parentGroup=parentAtUri (immutable)
    const childConfig: CommunityConfig = {
      $type: 'net.atrarium.group.config',
      name,
      description,
      hashtag,
      stage: 'theme', // Always created as Theme
      accessType: 'open',
      parentCommunity: parentAtUri, // Immutable parent reference
      feedMix: feedMix || { own: 0.7, parent: 0.3, global: 0.0 },
      createdAt: new Date().toISOString(),
    };

    // Validate before creating
    const validated = validateCommunityConfig(childConfig);

    // Create record in PDS
    const response = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did || '',
      collection: 'net.atrarium.group.config',
      record: validated,
    });

    return {
      ...validated,
      uri: response.data.uri,
      cid: response.data.cid,
      rkey: response.data.uri.split('/').pop() || '',
    };
  }

  /**
   * Upgrade group stage with Dunbar threshold validation
   * @param groupId Group ID or AT-URI
   * @param targetStage Target stage ('community' or 'graduated')
   * @returns Updated group config
   */
  async upgradeGroupStage(
    groupId: string,
    targetStage: 'community' | 'graduated'
  ): Promise<CommunityConfig & { uri: string; cid: string }> {
    const agent = await this.getAgent();

    // Step 1: Fetch current group config from PDS
    const currentConfig = await this.getCommunityConfig(groupId);

    if (!currentConfig) {
      throw new Error(`Group not found: ${groupId}`);
    }

    // Step 2: Query member count
    const memberCount = await this.getMemberCount(groupId);

    // Step 3: Validate stage transition rules (using imported validation functions)
    const { validateStageUpgrade } = await import('../schemas/validation.js');
    const validation = validateStageUpgrade(currentConfig.stage, targetStage, memberCount);

    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid stage upgrade');
    }

    // Step 4: Update group record with new stage (putRecord)
    const updatedConfig: CommunityConfig = {
      ...currentConfig,
      stage: targetStage,
      updatedAt: new Date().toISOString(),
    };

    // Validate before updating
    const validated = validateCommunityConfig(updatedConfig);

    // Update record in PDS
    const response = await agent.com.atproto.repo.putRecord({
      repo: agent.session?.did || '',
      collection: 'net.atrarium.group.config',
      rkey: groupId,
      record: validated,
    });

    return {
      ...validated,
      uri: response.data.uri,
      cid: response.data.cid,
    };
  }

  /**
   * Downgrade group stage (bidirectional transitions)
   * @param groupId Group ID or AT-URI
   * @param targetStage Target stage ('theme' or 'community')
   * @returns Updated group config
   */
  async downgradeGroupStage(
    groupId: string,
    targetStage: 'theme' | 'community'
  ): Promise<CommunityConfig & { uri: string; cid: string }> {
    const agent = await this.getAgent();

    // Step 1: Fetch current group config from PDS
    const currentConfig = await this.getCommunityConfig(groupId);

    if (!currentConfig) {
      throw new Error(`Group not found: ${groupId}`);
    }

    // Step 2: Validate downgrade rules
    const { validateStageDowngrade } = await import('../schemas/validation.js');
    const validation = validateStageDowngrade(currentConfig.stage, targetStage);

    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid stage downgrade');
    }

    // Step 3: Update group record with downgraded stage
    // Note: parentGroup field is retained (immutable)
    const updatedConfig: CommunityConfig = {
      ...currentConfig,
      stage: targetStage,
      updatedAt: new Date().toISOString(),
    };

    // Validate before updating
    const validated = validateCommunityConfig(updatedConfig);

    // Update record in PDS
    const response = await agent.com.atproto.repo.putRecord({
      repo: agent.session?.did || '',
      collection: 'net.atrarium.group.config',
      rkey: groupId,
      record: validated,
    });

    return {
      ...validated,
      uri: response.data.uri,
      cid: response.data.cid,
    };
  }

  /**
   * List child groups of a parent group
   * @param parentId Parent group ID or AT-URI
   * @param limit Maximum results (default 50)
   * @param cursor Pagination cursor
   * @returns Array of child group configs
   */
  async listChildGroups(
    parentId: string,
    limit = 50,
    _cursor?: string
  ): Promise<{
    children: CommunityConfig[];
    cursor?: string;
  }> {
    const agent = await this.getAgent();

    // Construct parent AT-URI
    const parentAtUri = `at://${agent.session?.did}/net.atrarium.group.config/${parentId}`;

    // Query PDS for groups with parentCommunity === parentAtUri
    // Note: AT Protocol listRecords does not support filtering, so we fetch all and filter client-side
    const response = await agent.com.atproto.repo.listRecords({
      repo: agent.session?.did || '',
      collection: 'net.atrarium.group.config',
      limit,
    });

    // Filter records where parentCommunity matches parent AT-URI
    const children = response.data.records
      .map((record) => record.value as CommunityConfig)
      .filter((config) => config.parentCommunity === parentAtUri);

    return {
      children,
      cursor: response.data.cursor,
    };
  }

  /**
   * Get parent group of a child group
   * @param childId Child group ID or AT-URI
   * @returns Parent group config or null if no parent
   */
  async getParentGroup(childId: string): Promise<CommunityConfig | null> {
    // Step 1: Fetch child group config
    const childConfig = await this.getCommunityConfig(childId);

    if (!childConfig) {
      throw new Error(`Group not found: ${childId}`);
    }

    // Step 2: Extract parentGroup AT-URI
    if (!childConfig.parentCommunity) {
      return null; // No parent
    }

    // Step 3: Resolve parent AT-URI → fetch parent GroupConfig
    // Parse AT-URI: at://did:plc:xxx/net.atrarium.group.config/rkey
    const parts = childConfig.parentCommunity.split('/');
    const parentRkey = parts.pop() || '';

    if (!parentRkey) {
      throw new Error(`Invalid parent AT-URI: ${childConfig.parentCommunity}`);
    }

    // Fetch parent config
    const parentConfig = await this.getCommunityConfig(parentRkey);

    return parentConfig;
  }

  /**
   * Get active member count for a group
   * @param groupId Group ID or AT-URI
   * @returns Count of active memberships
   */
  async getMemberCount(groupId: string): Promise<number> {
    const agent = await this.getAgent();

    // Construct group AT-URI
    const groupAtUri = `at://${agent.session?.did}/net.atrarium.group.config/${groupId}`;

    // Query PDS for membership records
    // Note: AT Protocol does not support filtering, so we fetch all and filter client-side
    const response = await agent.com.atproto.repo.listRecords({
      repo: agent.session?.did || '',
      collection: 'net.atrarium.group.membership',
      limit: 100, // Reasonable limit for member count queries
    });

    // Filter memberships: membership.community === groupAtUri && membership.active === true
    const activeMembers = response.data.records
      .map((record) => record.value as MembershipRecord)
      .filter((membership) => membership.community === groupAtUri && membership.active === true);

    return activeMembers.length;
  }
}
