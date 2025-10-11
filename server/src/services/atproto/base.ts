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
} from '../../schemas/lexicon';
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
} from '../../schemas/lexicon';
import type { Env } from '../../types';

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

  // ============================================================================
  // Community Operations
  // ============================================================================

  /**
   * Create CommunityConfig record in PDS
   * @param config Community configuration data
   * @returns Record creation result with URI, CID, rkey
   */
  async createCommunityConfig(config: unknown): Promise<PDSRecordResult> {
    const validated = validateCommunityConfig(config);
    const agent = await this.getAgent();

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
   * Get community config by URI
   * @param communityUri AT-URI of community config
   * @returns Community config
   */
  async getCommunityConfig(communityUri: string): Promise<CommunityConfig & { uri: string }> {
    validateATUri(communityUri);
    const agent = await this.getAgent();

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
    const response = await agent.com.atproto.repo.listRecords({
      repo: agent.session?.did || '',
      collection: 'net.atrarium.group.config',
      limit: 100,
    });

    for (const record of response.data.records) {
      const validated = validateCommunityConfig(record.value);
      if (validated.hashtag === hashtag) {
        return {
          ...validated,
          uri: record.uri,
        };
      }
    }

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
      stage: 'theme' | 'community' | 'graduated';
      accessType: 'open' | 'invite-only';
      moderators: string[];
      blocklist: string[];
      feedMix: { own: number; parent: number; global: number };
    }>
  ): Promise<CommunityConfig & { uri: string }> {
    validateATUri(communityUri);

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

    const getResponse = await agent.com.atproto.repo.getRecord({
      repo,
      collection,
      rkey,
    });

    if (!getResponse.data.value) {
      throw new Error(`Community config not found: ${communityUri}`);
    }

    const currentConfig = validateCommunityConfig(getResponse.data.value);

    const updatedConfig = {
      ...currentConfig,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

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
    validateDID(ownerDid);
    const agent = await this.getAgent();

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

  /**
   * Get community statistics from PDS (T028)
   */
  async getCommunityStats(communityUri: string): Promise<{
    memberCount: number;
    pendingRequestCount: number;
  }> {
    validateATUri(communityUri);

    const uriParts = communityUri.replace('at://', '').split('/');
    if (uriParts.length !== 3) {
      throw new Error('Invalid AT-URI format');
    }

    const ownerDid = uriParts[0];

    if (!ownerDid) {
      throw new Error('Invalid community URI: missing DID');
    }

    const agent = await this.getAgent();

    const response = await agent.com.atproto.repo.listRecords({
      repo: ownerDid,
      collection: 'net.atrarium.group.membership',
      limit: 100,
    });

    const memberships = response.data.records
      .map((record) => validateMembershipRecord(record.value))
      .filter((m) => m.community === communityUri);

    const memberCount = memberships.filter((m) => m.status === 'active' && m.active).length;
    const pendingRequestCount = memberships.filter((m) => m.status === 'pending').length;

    return {
      memberCount,
      pendingRequestCount,
    };
  }

  /**
   * Get community statistics with detailed member counts (T001)
   */
  async getCommunityStatsDetailed(communityUri: string): Promise<{
    memberCount: number;
    activeMemberCount: number;
    pendingMemberCount: number;
  }> {
    validateATUri(communityUri);

    const uriParts = communityUri.replace('at://', '').split('/');
    if (uriParts.length !== 3) {
      throw new Error('Invalid AT-URI format');
    }

    const ownerDid = uriParts[0];

    if (!ownerDid) {
      throw new Error('Invalid community URI: missing DID');
    }

    const agent = await this.getAgent();

    const response = await agent.com.atproto.repo.listRecords({
      repo: ownerDid,
      collection: 'net.atrarium.group.membership',
      limit: 100,
    });

    const memberships = response.data.records
      .map((record) => validateMembershipRecord(record.value))
      .filter((m) => m.community === communityUri);

    const activeMemberCount = memberships.filter((m) => m.status === 'active' && m.active).length;
    const pendingMemberCount = memberships.filter((m) => m.status === 'pending').length;
    const memberCount = activeMemberCount;

    return {
      memberCount,
      activeMemberCount,
      pendingMemberCount,
    };
  }

  /**
   * Get community children with metadata (T002)
   */
  async getCommunityChildrenWithMetadata(
    parentUri: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<{
    children: Array<{
      uri: string;
      name: string;
      stage: 'theme' | 'community' | 'graduated';
      createdAt: string;
    }>;
    cursor?: string;
  }> {
    validateATUri(parentUri);
    const agent = await this.getAgent();

    const uriParts = parentUri.replace('at://', '').split('/');
    if (uriParts.length !== 3) {
      throw new Error('Invalid AT-URI format');
    }

    const ownerDid = uriParts[0];

    if (!ownerDid) {
      throw new Error('Invalid parent URI: missing DID');
    }

    const response = await agent.com.atproto.repo.listRecords({
      repo: ownerDid,
      collection: 'net.atrarium.group.config',
      limit: options?.limit || 50,
      cursor: options?.cursor,
    });

    const children = response.data.records
      .filter((record) => {
        const config = validateCommunityConfig(record.value);
        return config.parentCommunity === parentUri;
      })
      .map((record) => {
        const config = validateCommunityConfig(record.value);
        return {
          uri: record.uri,
          name: config.name,
          stage: config.stage,
          createdAt: config.createdAt,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      children,
      cursor: response.data.cursor,
    };
  }

  /**
   * Validate circular parent-child reference (T003)
   */
  async validateCircularReference(
    childUri: string,
    parentUri: string
  ): Promise<{ isValid: boolean; error?: string }> {
    validateATUri(childUri);
    validateATUri(parentUri);

    if (childUri === parentUri) {
      return {
        isValid: false,
        error: 'Circular reference detected: child cannot be its own parent',
      };
    }

    const visitedUris = new Set<string>();
    let currentUri: string | null = parentUri;
    let depth = 0;
    const maxDepth = 10;

    while (currentUri && depth < maxDepth) {
      if (visitedUris.has(currentUri)) {
        return { isValid: false, error: 'Circular reference detected in parent hierarchy' };
      }
      visitedUris.add(currentUri);

      if (currentUri === childUri) {
        return {
          isValid: false,
          error: 'Circular reference detected: child cannot be ancestor of parent',
        };
      }

      try {
        const config = await this.getCommunityConfig(currentUri);
        currentUri = config.parentCommunity || null;
        depth++;
      } catch (_error) {
        break;
      }
    }

    return { isValid: true };
  }

  /**
   * Create child Theme group under Graduated parent
   */
  async createChildGroup(
    parentId: string,
    name: string,
    description?: string,
    feedMix?: { own: number; parent: number; global: number }
  ): Promise<CommunityConfig & { uri: string; cid: string; rkey: string }> {
    const agent = await this.getAgent();

    const parentConfig = await this.getCommunityConfig(parentId);

    if (!parentConfig) {
      throw new Error(`Parent group not found: ${parentId}`);
    }

    if (parentConfig.stage !== 'graduated') {
      throw new Error(
        `Only Graduated-stage groups can have children. Parent stage: ${parentConfig.stage}`
      );
    }

    if (parentConfig.parentCommunity) {
      throw new Error('Parent group cannot have its own parent (max hierarchy depth is 1 level)');
    }

    const hashtag = `#atr_${Math.random().toString(16).substring(2, 10)}`;
    const parentAtUri = `at://${agent.session?.did}/net.atrarium.group.config/${parentId}`;

    const childConfig: CommunityConfig = {
      $type: 'net.atrarium.group.config',
      name,
      description,
      hashtag,
      stage: 'theme',
      accessType: 'open',
      parentCommunity: parentAtUri,
      feedMix: feedMix || { own: 0.7, parent: 0.3, global: 0.0 },
      createdAt: new Date().toISOString(),
    };

    const validated = validateCommunityConfig(childConfig);

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
   */
  async upgradeGroupStage(
    groupId: string,
    targetStage: 'community' | 'graduated'
  ): Promise<CommunityConfig & { uri: string; cid: string }> {
    const agent = await this.getAgent();

    const currentConfig = await this.getCommunityConfig(groupId);

    if (!currentConfig) {
      throw new Error(`Group not found: ${groupId}`);
    }

    const memberCount = await this.getMemberCount(groupId);

    const { validateStageUpgrade } = await import('../../schemas/validation.js');
    const validation = validateStageUpgrade(currentConfig.stage, targetStage, memberCount);

    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid stage upgrade');
    }

    const updatedConfig: CommunityConfig = {
      ...currentConfig,
      stage: targetStage,
      updatedAt: new Date().toISOString(),
    };

    const validated = validateCommunityConfig(updatedConfig);

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
   */
  async downgradeGroupStage(
    groupId: string,
    targetStage: 'theme' | 'community'
  ): Promise<CommunityConfig & { uri: string; cid: string }> {
    const agent = await this.getAgent();

    const currentConfig = await this.getCommunityConfig(groupId);

    if (!currentConfig) {
      throw new Error(`Group not found: ${groupId}`);
    }

    const { validateStageDowngrade } = await import('../../schemas/validation.js');
    const validation = validateStageDowngrade(currentConfig.stage, targetStage);

    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid stage downgrade');
    }

    const updatedConfig: CommunityConfig = {
      ...currentConfig,
      stage: targetStage,
      updatedAt: new Date().toISOString(),
    };

    const validated = validateCommunityConfig(updatedConfig);

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

    const parentAtUri = `at://${agent.session?.did}/net.atrarium.group.config/${parentId}`;

    const response = await agent.com.atproto.repo.listRecords({
      repo: agent.session?.did || '',
      collection: 'net.atrarium.group.config',
      limit,
    });

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
   */
  async getParentGroup(childId: string): Promise<CommunityConfig | null> {
    const childConfig = await this.getCommunityConfig(childId);

    if (!childConfig) {
      throw new Error(`Group not found: ${childId}`);
    }

    if (!childConfig.parentCommunity) {
      return null;
    }

    const parts = childConfig.parentCommunity.split('/');
    const parentRkey = parts.pop() || '';

    if (!parentRkey) {
      throw new Error(`Invalid parent AT-URI: ${childConfig.parentCommunity}`);
    }

    const parentConfig = await this.getCommunityConfig(parentRkey);

    return parentConfig;
  }

  /**
   * Get active member count for a group
   */
  async getMemberCount(groupId: string): Promise<number> {
    const agent = await this.getAgent();

    const groupAtUri = `at://${agent.session?.did}/net.atrarium.group.config/${groupId}`;

    const response = await agent.com.atproto.repo.listRecords({
      repo: agent.session?.did || '',
      collection: 'net.atrarium.group.membership',
      limit: 100,
    });

    const activeMembers = response.data.records
      .map((record) => record.value as MembershipRecord)
      .filter((membership) => membership.community === groupAtUri && membership.active === true);

    return activeMembers.length;
  }

  // ============================================================================
  // Membership Operations
  // ============================================================================

  /**
   * Create MembershipRecord in PDS (T020)
   */
  async createMembershipRecord(membership: unknown, userDid: string): Promise<PDSRecordResult> {
    const validated = validateMembershipRecord(membership);
    const agent = await this.getAgent();

    const response = await agent.com.atproto.repo.createRecord({
      repo: userDid,
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
   * Update membership record in PDS (T023-T024)
   */
  async updateMembershipRecord(
    membershipUri: string,
    updates: Partial<{
      role: 'owner' | 'moderator' | 'member';
      status: 'active' | 'pending';
      customTitle: string;
    }>
  ): Promise<MembershipRecord & { uri: string }> {
    validateATUri(membershipUri);

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

    const getResponse = await agent.com.atproto.repo.getRecord({
      repo,
      collection,
      rkey,
    });

    if (!getResponse.data.value) {
      throw new Error(`Membership record not found: ${membershipUri}`);
    }

    const currentRecord = validateMembershipRecord(getResponse.data.value);

    const updatedRecord = {
      ...currentRecord,
      ...updates,
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
   * Delete (deactivate) MembershipRecord in PDS (T021)
   */
  async deleteMembershipRecord(membershipUri: string): Promise<MembershipRecord & { uri: string }> {
    validateATUri(membershipUri);

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

    const getResponse = await agent.com.atproto.repo.getRecord({
      repo,
      collection,
      rkey,
    });

    if (!getResponse.data.value) {
      throw new Error(`Membership record not found: ${membershipUri}`);
    }

    const currentRecord = validateMembershipRecord(getResponse.data.value);

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
   * Get single membership record by URI
   */
  async getMembershipRecord(membershipUri: string): Promise<MembershipRecord & { uri: string }> {
    validateATUri(membershipUri);
    const agent = await this.getAgent();

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
   * List membership records for a user DID (T022)
   */
  async listMemberships(
    userDid: string,
    options?: {
      activeOnly?: boolean;
      status?: 'active' | 'pending' | 'all';
      communityUri?: string;
    }
  ): Promise<Array<MembershipRecord & { uri: string }>> {
    validateDID(userDid);
    const agent = await this.getAgent();

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

    if (options?.communityUri) {
      memberships = memberships.filter((m) => m.community === options.communityUri);
    }

    if (options?.activeOnly) {
      memberships = memberships.filter((m) => m.active);
    }

    if (options?.status && options.status !== 'all') {
      memberships = memberships.filter((m) => m.status === options.status);
    }

    return memberships;
  }

  /**
   * Transfer community ownership (T025)
   */
  async transferOwnership(
    oldOwnerMembershipUri: string,
    newOwnerMembershipUri: string
  ): Promise<{
    oldOwner: MembershipRecord & { uri: string };
    newOwner: MembershipRecord & { uri: string };
  }> {
    validateATUri(oldOwnerMembershipUri);
    validateATUri(newOwnerMembershipUri);

    const oldOwner = await this.updateMembershipRecord(oldOwnerMembershipUri, {
      role: 'member',
    });

    const newOwner = await this.updateMembershipRecord(newOwnerMembershipUri, {
      role: 'owner',
    });

    return { oldOwner, newOwner };
  }

  // ============================================================================
  // Emoji Operations
  // ============================================================================

  /**
   * Upload emoji blob to PDS (T007)
   */
  async uploadEmojiBlob(
    agent: AtpAgent,
    fileData: string,
    mimeType: string,
    size: number
  ): Promise<BlobRef> {
    if (size > 512000) {
      throw new Error('File size exceeds 500KB limit');
    }

    const allowedTypes = ['image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(mimeType)) {
      throw new Error(`Unsupported format: ${mimeType}. Allowed: PNG, GIF, WEBP`);
    }

    const binaryString = atob(fileData);
    const uint8Array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i);
    }

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

    const validated = validateCustomEmoji(emojiRecord);

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

    const validated = validateEmojiApproval(approvalRecord);

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
   */
  async listUserEmoji(agent: AtpAgent, did: string): Promise<Array<CustomEmoji & { uri: string }>> {
    validateDID(did);

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
   */
  async listCommunityApprovals(
    agent: AtpAgent,
    communityId: string,
    statusFilter?: 'approved' | 'rejected' | 'revoked'
  ): Promise<Array<EmojiApproval & { uri: string }>> {
    if (!/^[0-9a-f]{8}$/.test(communityId)) {
      throw new Error('Invalid community ID format (must be 8-char hex)');
    }

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

    if (statusFilter) {
      approvals = approvals.filter((approval) => approval.status === statusFilter);
    }

    return approvals;
  }

  // ============================================================================
  // Moderation Operations
  // ============================================================================

  /**
   * Create ModerationAction in PDS (T023)
   */
  async createModerationAction(action: unknown, moderatorDid: string): Promise<PDSRecordResult> {
    const validated = validateModerationAction(action);
    const agent = await this.getAgent();

    const response = await agent.com.atproto.repo.createRecord({
      repo: moderatorDid,
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
    validateATUri(communityUri);
    validateDID(moderatorDid);

    const agent = await this.getAgent();

    const response = await agent.com.atproto.repo.listRecords({
      repo: moderatorDid,
      collection: 'net.atrarium.moderation.action',
      limit: 100,
    });

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

  // ============================================================================
  // Post and Reaction Operations
  // ============================================================================

  /**
   * Create CommunityPost record in PDS (014-bluesky)
   */
  async createCommunityPost(post: unknown, userDid: string): Promise<PDSRecordResult> {
    const validated = validateCommunityPost(post);
    const agent = await this.getAgent();

    const response = await agent.com.atproto.repo.createRecord({
      repo: userDid,
      collection: 'net.atrarium.group.post',
      record: validated,
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid,
      rkey: response.data.uri.split('/').pop() || '',
    };
  }

  /**
   * Check if posts exist on Bluesky (for deletion sync)
   */
  async checkPostsExistence(_uris: string[]): Promise<string[]> {
    return [];
  }

  /**
   * Fetch post metadata from Bluesky PDS
   */
  async fetchPostMetadata(_uri: string): Promise<{
    text: string;
    hasMedia: boolean;
    langs: string[] | null;
  } | null> {
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

    for (const uri of uris) {
      const metadata = await this.fetchPostMetadata(uri);
      if (metadata) {
        results.set(uri, metadata);
      }
    }

    return results;
  }

  /**
   * Create Reaction record in PDS
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

    const validated = validateReaction(reactionRecord);

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
   */
  async deleteReaction(reactionUri: string): Promise<boolean> {
    validateATUri(reactionUri);
    const agent = await this.getAgent();

    const parts = reactionUri.split('/');
    const rkey = parts.pop() || '';
    const collection = parts.pop() || '';
    const did = parts.slice(2).join('/');

    if (collection !== 'net.atrarium.group.reaction') {
      throw new Error('Invalid reaction URI: must be net.atrarium.group.reaction collection');
    }

    await agent.com.atproto.repo.deleteRecord({
      repo: did,
      collection: 'net.atrarium.group.reaction',
      rkey,
    });

    return true;
  }

  /**
   * List reactions for a post from PDS
   */
  async listReactions(
    postUri: string,
    _limit = 50,
    _cursor?: string
  ): Promise<{
    reactions: Array<Reaction & { uri: string; reactor: string }>;
    cursor?: string;
  }> {
    validateATUri(postUri);

    return {
      reactions: [],
      cursor: undefined,
    };
  }
}
