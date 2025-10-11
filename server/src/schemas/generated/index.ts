/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type FetchHandler, type FetchHandlerOptions, XrpcClient } from '@atproto/xrpc';
import { schemas } from './lexicons.js';
import type * as NetAtrariumEmojiApproval from './types/net/atrarium/emoji/approval.js';
import type * as NetAtrariumEmojiCustom from './types/net/atrarium/emoji/custom.js';
import type * as NetAtrariumGroupConfig from './types/net/atrarium/group/config.js';
import type * as NetAtrariumGroupMembership from './types/net/atrarium/group/membership.js';
import type * as NetAtrariumGroupPost from './types/net/atrarium/group/post.js';
import type * as NetAtrariumGroupReaction from './types/net/atrarium/group/reaction.js';
import type * as NetAtrariumModerationAction from './types/net/atrarium/moderation/action.js';
import type { OmitKey, Un$Typed } from './util.js';

export * as NetAtrariumEmojiApproval from './types/net/atrarium/emoji/approval.js';
export * as NetAtrariumEmojiCustom from './types/net/atrarium/emoji/custom.js';
export * as NetAtrariumGroupConfig from './types/net/atrarium/group/config.js';
export * as NetAtrariumGroupMembership from './types/net/atrarium/group/membership.js';
export * as NetAtrariumGroupPost from './types/net/atrarium/group/post.js';
export * as NetAtrariumGroupReaction from './types/net/atrarium/group/reaction.js';
export * as NetAtrariumModerationAction from './types/net/atrarium/moderation/action.js';

export class AtpBaseClient extends XrpcClient {
  net: NetNS;

  constructor(options: FetchHandler | FetchHandlerOptions) {
    super(options, schemas);
    this.net = new NetNS(this);
  }

  /** @deprecated use `this` instead */
  get xrpc(): XrpcClient {
    return this;
  }
}

export class NetNS {
  _client: XrpcClient;
  atrarium: NetAtrariumNS;

  constructor(client: XrpcClient) {
    this._client = client;
    this.atrarium = new NetAtrariumNS(client);
  }
}

export class NetAtrariumNS {
  _client: XrpcClient;
  emoji: NetAtrariumEmojiNS;
  group: NetAtrariumGroupNS;
  moderation: NetAtrariumModerationNS;

  constructor(client: XrpcClient) {
    this._client = client;
    this.emoji = new NetAtrariumEmojiNS(client);
    this.group = new NetAtrariumGroupNS(client);
    this.moderation = new NetAtrariumModerationNS(client);
  }
}

export class NetAtrariumEmojiNS {
  _client: XrpcClient;
  approval: NetAtrariumEmojiApprovalRecord;
  custom: NetAtrariumEmojiCustomRecord;

  constructor(client: XrpcClient) {
    this._client = client;
    this.approval = new NetAtrariumEmojiApprovalRecord(client);
    this.custom = new NetAtrariumEmojiCustomRecord(client);
  }
}

export class NetAtrariumEmojiApprovalRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>): Promise<{
    cursor?: string;
    records: { uri: string; value: NetAtrariumEmojiApproval.Record }[];
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'net.atrarium.emoji.approval',
      ...params,
    });
    return res.data;
  }

  async get(params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>): Promise<{
    uri: string;
    cid: string;
    value: NetAtrariumEmojiApproval.Record;
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'net.atrarium.emoji.approval',
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<ComAtprotoRepoCreateRecord.InputSchema, 'collection' | 'record'>,
    record: Un$Typed<NetAtrariumEmojiApproval.Record>,
    headers?: Record<string, string>
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'net.atrarium.emoji.approval';
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers }
    );
    return res.data;
  }

  async put(
    params: OmitKey<ComAtprotoRepoPutRecord.InputSchema, 'collection' | 'record'>,
    record: Un$Typed<NetAtrariumEmojiApproval.Record>,
    headers?: Record<string, string>
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'net.atrarium.emoji.approval';
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers }
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'net.atrarium.emoji.approval', ...params },
      { headers }
    );
  }
}

export class NetAtrariumEmojiCustomRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>): Promise<{
    cursor?: string;
    records: { uri: string; value: NetAtrariumEmojiCustom.Record }[];
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'net.atrarium.emoji.custom',
      ...params,
    });
    return res.data;
  }

  async get(params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>): Promise<{
    uri: string;
    cid: string;
    value: NetAtrariumEmojiCustom.Record;
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'net.atrarium.emoji.custom',
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<ComAtprotoRepoCreateRecord.InputSchema, 'collection' | 'record'>,
    record: Un$Typed<NetAtrariumEmojiCustom.Record>,
    headers?: Record<string, string>
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'net.atrarium.emoji.custom';
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers }
    );
    return res.data;
  }

  async put(
    params: OmitKey<ComAtprotoRepoPutRecord.InputSchema, 'collection' | 'record'>,
    record: Un$Typed<NetAtrariumEmojiCustom.Record>,
    headers?: Record<string, string>
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'net.atrarium.emoji.custom';
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers }
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'net.atrarium.emoji.custom', ...params },
      { headers }
    );
  }
}

export class NetAtrariumGroupNS {
  _client: XrpcClient;
  config: NetAtrariumGroupConfigRecord;
  membership: NetAtrariumGroupMembershipRecord;
  post: NetAtrariumGroupPostRecord;
  reaction: NetAtrariumGroupReactionRecord;

  constructor(client: XrpcClient) {
    this._client = client;
    this.config = new NetAtrariumGroupConfigRecord(client);
    this.membership = new NetAtrariumGroupMembershipRecord(client);
    this.post = new NetAtrariumGroupPostRecord(client);
    this.reaction = new NetAtrariumGroupReactionRecord(client);
  }
}

export class NetAtrariumGroupConfigRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>): Promise<{
    cursor?: string;
    records: { uri: string; value: NetAtrariumGroupConfig.Record }[];
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'net.atrarium.group.config',
      ...params,
    });
    return res.data;
  }

  async get(params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>): Promise<{
    uri: string;
    cid: string;
    value: NetAtrariumGroupConfig.Record;
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'net.atrarium.group.config',
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<ComAtprotoRepoCreateRecord.InputSchema, 'collection' | 'record'>,
    record: Un$Typed<NetAtrariumGroupConfig.Record>,
    headers?: Record<string, string>
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'net.atrarium.group.config';
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers }
    );
    return res.data;
  }

  async put(
    params: OmitKey<ComAtprotoRepoPutRecord.InputSchema, 'collection' | 'record'>,
    record: Un$Typed<NetAtrariumGroupConfig.Record>,
    headers?: Record<string, string>
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'net.atrarium.group.config';
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers }
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'net.atrarium.group.config', ...params },
      { headers }
    );
  }
}

export class NetAtrariumGroupMembershipRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>): Promise<{
    cursor?: string;
    records: { uri: string; value: NetAtrariumGroupMembership.Record }[];
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'net.atrarium.group.membership',
      ...params,
    });
    return res.data;
  }

  async get(params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>): Promise<{
    uri: string;
    cid: string;
    value: NetAtrariumGroupMembership.Record;
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'net.atrarium.group.membership',
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<ComAtprotoRepoCreateRecord.InputSchema, 'collection' | 'record'>,
    record: Un$Typed<NetAtrariumGroupMembership.Record>,
    headers?: Record<string, string>
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'net.atrarium.group.membership';
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers }
    );
    return res.data;
  }

  async put(
    params: OmitKey<ComAtprotoRepoPutRecord.InputSchema, 'collection' | 'record'>,
    record: Un$Typed<NetAtrariumGroupMembership.Record>,
    headers?: Record<string, string>
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'net.atrarium.group.membership';
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers }
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'net.atrarium.group.membership', ...params },
      { headers }
    );
  }
}

export class NetAtrariumGroupPostRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>): Promise<{
    cursor?: string;
    records: { uri: string; value: NetAtrariumGroupPost.Record }[];
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'net.atrarium.group.post',
      ...params,
    });
    return res.data;
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>
  ): Promise<{ uri: string; cid: string; value: NetAtrariumGroupPost.Record }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'net.atrarium.group.post',
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<ComAtprotoRepoCreateRecord.InputSchema, 'collection' | 'record'>,
    record: Un$Typed<NetAtrariumGroupPost.Record>,
    headers?: Record<string, string>
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'net.atrarium.group.post';
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers }
    );
    return res.data;
  }

  async put(
    params: OmitKey<ComAtprotoRepoPutRecord.InputSchema, 'collection' | 'record'>,
    record: Un$Typed<NetAtrariumGroupPost.Record>,
    headers?: Record<string, string>
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'net.atrarium.group.post';
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers }
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'net.atrarium.group.post', ...params },
      { headers }
    );
  }
}

export class NetAtrariumGroupReactionRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>): Promise<{
    cursor?: string;
    records: { uri: string; value: NetAtrariumGroupReaction.Record }[];
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'net.atrarium.group.reaction',
      ...params,
    });
    return res.data;
  }

  async get(params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>): Promise<{
    uri: string;
    cid: string;
    value: NetAtrariumGroupReaction.Record;
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'net.atrarium.group.reaction',
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<ComAtprotoRepoCreateRecord.InputSchema, 'collection' | 'record'>,
    record: Un$Typed<NetAtrariumGroupReaction.Record>,
    headers?: Record<string, string>
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'net.atrarium.group.reaction';
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers }
    );
    return res.data;
  }

  async put(
    params: OmitKey<ComAtprotoRepoPutRecord.InputSchema, 'collection' | 'record'>,
    record: Un$Typed<NetAtrariumGroupReaction.Record>,
    headers?: Record<string, string>
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'net.atrarium.group.reaction';
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers }
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'net.atrarium.group.reaction', ...params },
      { headers }
    );
  }
}

export class NetAtrariumModerationNS {
  _client: XrpcClient;
  action: NetAtrariumModerationActionRecord;

  constructor(client: XrpcClient) {
    this._client = client;
    this.action = new NetAtrariumModerationActionRecord(client);
  }
}

export class NetAtrariumModerationActionRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>): Promise<{
    cursor?: string;
    records: { uri: string; value: NetAtrariumModerationAction.Record }[];
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'net.atrarium.moderation.action',
      ...params,
    });
    return res.data;
  }

  async get(params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>): Promise<{
    uri: string;
    cid: string;
    value: NetAtrariumModerationAction.Record;
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'net.atrarium.moderation.action',
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<ComAtprotoRepoCreateRecord.InputSchema, 'collection' | 'record'>,
    record: Un$Typed<NetAtrariumModerationAction.Record>,
    headers?: Record<string, string>
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'net.atrarium.moderation.action';
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers }
    );
    return res.data;
  }

  async put(
    params: OmitKey<ComAtprotoRepoPutRecord.InputSchema, 'collection' | 'record'>,
    record: Un$Typed<NetAtrariumModerationAction.Record>,
    headers?: Record<string, string>
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'net.atrarium.moderation.action';
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers }
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'net.atrarium.moderation.action', ...params },
      { headers }
    );
  }
}
