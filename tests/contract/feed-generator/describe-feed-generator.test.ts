// Contract Test: GET /xrpc/app.bsky.feed.describeFeedGenerator
// Verifies feed metadata response format

import { describe, it, expect, beforeEach } from 'vitest';
import app from '../../../src/index';
import { createMockEnv } from '../../helpers/test-env';
import type { FeedGeneratorDescription } from '../../../src/types';

describe('Contract: GET /xrpc/app.bsky.feed.describeFeedGenerator', () => {
  let env: any;

  beforeEach(async () => {
    env = createMockEnv();
    // Note: In actual tests with Miniflare, DB will be populated
  });

  it('should return valid feed generator description', async () => {
    const request = new Request(
      'http://localhost:8787/xrpc/app.bsky.feed.describeFeedGenerator'
    );

    const response = await app.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');

    const description = await response.json() as FeedGeneratorDescription;

    // Verify structure
    expect(description).toHaveProperty('did');
    expect(description.did).toMatch(/^did:web:/);

    expect(description).toHaveProperty('feeds');
    expect(Array.isArray(description.feeds)).toBe(true);
  });

  it('should return feeds array with correct structure', async () => {
    const request = new Request(
      'http://localhost:8787/xrpc/app.bsky.feed.describeFeedGenerator'
    );

    const response = await app.fetch(request, env, {} as ExecutionContext);
    const description = await response.json() as FeedGeneratorDescription;

    // Each feed should have uri, displayName
    if (description.feeds.length > 0) {
      const feed = description.feeds[0];
      if (feed) {
        expect(feed).toHaveProperty('uri');
        expect(feed.uri).toMatch(/^at:\/\/did:web:.+\/app\.bsky\.feed\.generator\/.+$/);
        expect(feed).toHaveProperty('displayName');
        expect(typeof feed.displayName).toBe('string');
      }
    }
  });

  it('should include description field (optional)', async () => {
    const request = new Request(
      'http://localhost:8787/xrpc/app.bsky.feed.describeFeedGenerator'
    );

    const response = await app.fetch(request, env, {} as ExecutionContext);
    const description = await response.json() as FeedGeneratorDescription;

    if (description.feeds.length > 0) {
      const feed = description.feeds[0];
      if (feed) {
        // description is optional, but if present should be string
        if (feed.description !== undefined) {
          expect(typeof feed.description).toBe('string');
        }
      }
    }
  });
});
