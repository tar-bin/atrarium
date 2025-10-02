// Contract Test: GET /xrpc/app.bsky.feed.getFeedSkeleton
// Verifies feed skeleton response, pagination, and parameter validation

import { describe, it, expect, beforeEach } from 'vitest';
import app from '../../../src/index';
import { createMockEnv } from '../../helpers/test-env';
import type { ErrorResponse, FeedSkeleton } from '../../../src/types';

describe('Contract: GET /xrpc/app.bsky.feed.getFeedSkeleton', () => {
  let env: any;

  beforeEach(() => {
    env = createMockEnv();
  });

  it('should require feed parameter', async () => {
    const request = new Request('http://localhost:8787/xrpc/app.bsky.feed.getFeedSkeleton');

    const response = await app.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(400);
    const error = await response.json() as ErrorResponse;
    expect(error).toHaveProperty('error');
    expect(error.error).toBe('InvalidRequest');
  });

  it('should validate feed URI format', async () => {
    const request = new Request(
      'http://localhost:8787/xrpc/app.bsky.feed.getFeedSkeleton?feed=invalid-uri'
    );

    const response = await app.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(400);
    const error = await response.json() as ErrorResponse;
    expect(error.message).toContain('feed');
  });

  it('should accept valid feed URI', async () => {
    const feedUri =
      'at://did:web:localhost:8787/app.bsky.feed.generator/550e8400-e29b-41d4-a716-446655440000';
    const request = new Request(
      `http://localhost:8787/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}`
    );

    const response = await app.fetch(request, env, {} as ExecutionContext);

    // Should return 200 even if feed doesn't exist (empty feed)
    expect(response.status).toBe(200);

    const skeleton = await response.json() as FeedSkeleton;
    expect(skeleton).toHaveProperty('feed');
    expect(Array.isArray(skeleton.feed)).toBe(true);
  });

  it('should return feed skeleton with correct structure', async () => {
    const feedUri =
      'at://did:web:localhost:8787/app.bsky.feed.generator/550e8400-e29b-41d4-a716-446655440000';
    const request = new Request(
      `http://localhost:8787/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}`
    );

    const response = await app.fetch(request, env, {} as ExecutionContext);
    const skeleton = await response.json() as FeedSkeleton;

    expect(skeleton).toHaveProperty('feed');
    expect(Array.isArray(skeleton.feed)).toBe(true);

    // cursor is optional
    if (skeleton.cursor !== undefined) {
      expect(typeof skeleton.cursor).toBe('string');
    }
  });

  it('should validate limit parameter', async () => {
    const feedUri =
      'at://did:web:localhost:8787/app.bsky.feed.generator/550e8400-e29b-41d4-a716-446655440000';
    const request = new Request(
      `http://localhost:8787/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}&limit=150`
    );

    const response = await app.fetch(request, env, {} as ExecutionContext);

    // limit > 100 should be rejected
    expect(response.status).toBe(400);
  });

  it('should accept valid limit parameter', async () => {
    const feedUri =
      'at://did:web:localhost:8787/app.bsky.feed.generator/550e8400-e29b-41d4-a716-446655440000';
    const request = new Request(
      `http://localhost:8787/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}&limit=50`
    );

    const response = await app.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(200);
  });

  it('should use default limit if not provided', async () => {
    const feedUri =
      'at://did:web:localhost:8787/app.bsky.feed.generator/550e8400-e29b-41d4-a716-446655440000';
    const request = new Request(
      `http://localhost:8787/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}`
    );

    const response = await app.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(200);
  });

  it('should accept cursor parameter for pagination', async () => {
    const feedUri =
      'at://did:web:localhost:8787/app.bsky.feed.generator/550e8400-e29b-41d4-a716-446655440000';
    const cursor = '1696291200::1';
    const request = new Request(
      `http://localhost:8787/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}&cursor=${cursor}`
    );

    const response = await app.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(200);
  });

  it('should return post URIs in correct format', async () => {
    const feedUri =
      'at://did:web:localhost:8787/app.bsky.feed.generator/550e8400-e29b-41d4-a716-446655440000';
    const request = new Request(
      `http://localhost:8787/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}`
    );

    const response = await app.fetch(request, env, {} as ExecutionContext);
    const skeleton = await response.json() as FeedSkeleton;

    // Each feed item should have { post: "at://..." }
    if (skeleton.feed.length > 0) {
      const item = skeleton.feed[0];
      if (item) {
        expect(item).toHaveProperty('post');
        expect(item.post).toMatch(/^at:\/\/did:(plc|web):.+\/app\.bsky\.feed\.post\/.+$/);
      }
    }
  });
});
