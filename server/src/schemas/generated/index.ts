/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type FetchHandler, type FetchHandlerOptions, XrpcClient } from '@atproto/xrpc';
import { CID } from 'multiformats/cid';
import { schemas } from './lexicons.js';
import type * as NetAtrariumCommunityConfig from './types/net/atrarium/community/config.js';
import type * as NetAtrariumCommunityMembership from './types/net/atrarium/community/membership.js';
import type * as NetAtrariumModerationAction from './types/net/atrarium/moderation/action.js';
import type { OmitKey, Un$Typed } from './util.js';

export * as NetAtrariumCommunityConfig from './types/net/atrarium/community/config.js';
export * as NetAtrariumCommunityMembership from './types/net/atrarium/community/membership.js';
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
  community: NetAtrariumCommunityNS;
  moderation: NetAtrariumModerationNS;

  constructor(client: XrpcClient) {
    this._client = client;
    this.community = new NetAtrariumCommunityNS(client);
    this.moderation = new NetAtrariumModerationNS(client);
  }
}

export class NetAtrariumCommunityNS {
  _client: XrpcClient;
  config: NetAtrariumCommunityConfigRecord;
  membership: NetAtrariumCommunityMembershipRecord;

  constructor(client: XrpcClient) {
    this._client = client;
    this.config = new NetAtrariumCommunityConfigRecord(client);
    this.membership = new NetAtrariumCommunityMembershipRecord(client);
  }
}

export class NetAtrariumCommunityConfigRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>): Promise<{
    cursor?: string;
    records: { uri: string; value: NetAtrariumCommunityConfig.Record }[];
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'net.atrarium.community.config',
      ...params,
    });
    return res.data;
  }

  async get(params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>): Promise<{
    uri: string;
    cid: string;
    value: NetAtrariumCommunityConfig.Record;
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'net.atrarium.community.config',
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<ComAtprotoRepoCreateRecord.InputSchema, 'collection' | 'record'>,
    record: Un$Typed<NetAtrariumCommunityConfig.Record>,
    headers?: Record<string, string>
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'net.atrarium.community.config';
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
    record: Un$Typed<NetAtrariumCommunityConfig.Record>,
    headers?: Record<string, string>
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'net.atrarium.community.config';
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
      { collection: 'net.atrarium.community.config', ...params },
      { headers }
    );
  }
}

export class NetAtrariumCommunityMembershipRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>): Promise<{
    cursor?: string;
    records: { uri: string; value: NetAtrariumCommunityMembership.Record }[];
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'net.atrarium.community.membership',
      ...params,
    });
    return res.data;
  }

  async get(params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>): Promise<{
    uri: string;
    cid: string;
    value: NetAtrariumCommunityMembership.Record;
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'net.atrarium.community.membership',
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<ComAtprotoRepoCreateRecord.InputSchema, 'collection' | 'record'>,
    record: Un$Typed<NetAtrariumCommunityMembership.Record>,
    headers?: Record<string, string>
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'net.atrarium.community.membership';
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
    record: Un$Typed<NetAtrariumCommunityMembership.Record>,
    headers?: Record<string, string>
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'net.atrarium.community.membership';
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
      { collection: 'net.atrarium.community.membership', ...params },
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
