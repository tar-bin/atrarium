// Integration Test: Lexicon Publication End-to-End
// Simulates PDS workflow: fetch schema → validate → cache → conditional request
// Based on quickstart.md steps 1-3

import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:8787';
const LEXICON_ENDPOINT = '/xrpc/net.atrarium.lexicon.get';

type LexiconSchema = {
  lexicon: number;
  id: string;
  defs: Record<string, unknown>;
};

type ErrorResponse = {
  error: string;
  message: string;
};

describe('Lexicon Publication Integration', () => {
  it('should complete end-to-end PDS workflow', async () => {
    // Step 1: PDS fetches community config schema
    const nsid = 'net.atrarium.community.config';
    const response = await fetch(`${BASE_URL}${LEXICON_ENDPOINT}?nsid=${nsid}`);

    expect(response.status).toBe(200);

    // Step 2: Validate JSON structure (AT Protocol Lexicon format)
    const schema = await response.json() as LexiconSchema;

    expect(schema).toHaveProperty('lexicon', 1);
    expect(schema).toHaveProperty('id', nsid);
    expect(schema).toHaveProperty('defs');
    expect(schema.defs).toHaveProperty('main');
    expect(schema.defs.main).toHaveProperty('type', 'record');

    // Step 3: Verify HTTP caching headers
    const etag = response.headers.get('ETag');
    const cacheControl = response.headers.get('Cache-Control');

    expect(etag).toBeTruthy();
    expect(etag).toMatch(/^"[a-f0-9]{16}"$/);
    expect(cacheControl).toContain('public');
    expect(cacheControl).toMatch(/max-age=\d+/);

    // Step 4: Test conditional request (If-None-Match)
    const cachedResponse = await fetch(`${BASE_URL}${LEXICON_ENDPOINT}?nsid=${nsid}`, {
      headers: {
        'If-None-Match': etag!,
      },
    });

    expect(cachedResponse.status).toBe(304);
    expect(cachedResponse.headers.get('ETag')).toBe(etag);

    const body = await cachedResponse.text();
    expect(body).toBe('');
  });

  it('should validate all 3 Atrarium schemas', async () => {
    const schemas = [
      'net.atrarium.community.config',
      'net.atrarium.community.membership',
      'net.atrarium.moderation.action',
    ];

    for (const nsid of schemas) {
      const response = await fetch(`${BASE_URL}${LEXICON_ENDPOINT}?nsid=${nsid}`);
      const schema = await response.json() as LexiconSchema;

      expect(response.status).toBe(200);
      expect(schema.id).toBe(nsid);
      expect(schema.lexicon).toBe(1);
      expect(schema.defs.main).toBeDefined();
    }
  });

  it('should support cross-origin requests (CORS)', async () => {
    // PDS from different domain fetches schema
    const response = await fetch(`${BASE_URL}${LEXICON_ENDPOINT}?nsid=net.atrarium.community.config`, {
      headers: {
        'Origin': 'https://example-pds.com',
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('should handle CORS preflight for cross-origin requests', async () => {
    const preflightResponse = await fetch(`${BASE_URL}${LEXICON_ENDPOINT}`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://example-pds.com',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'If-None-Match',
      },
    });

    expect(preflightResponse.status).toBe(204);
    expect(preflightResponse.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(preflightResponse.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    expect(preflightResponse.headers.get('Access-Control-Max-Age')).toBeTruthy();
  });

  it('should return 404 for unknown schema with error details', async () => {
    const response = await fetch(`${BASE_URL}${LEXICON_ENDPOINT}?nsid=net.atrarium.unknown.schema`);

    expect(response.status).toBe(404);

    const error = await response.json() as ErrorResponse;
    expect(error).toHaveProperty('error', 'InvalidRequest');
    expect(error).toHaveProperty('message');
    expect(error.message).toMatch(/not found|unknown/i);
  });

  it('should validate schema content matches Lexicon specification', async () => {
    const response = await fetch(`${BASE_URL}${LEXICON_ENDPOINT}?nsid=net.atrarium.community.config`);
    const schema = await response.json() as LexiconSchema & {
      defs: {
        main: {
          record: {
            properties: Record<string, unknown>;
            required: string[];
          }
        }
      }
    };

    // Community config specific validation
    expect(schema.defs.main.record.properties).toHaveProperty('name');
    expect(schema.defs.main.record.properties).toHaveProperty('hashtag');
    expect(schema.defs.main.record.properties).toHaveProperty('stage');
    expect(schema.defs.main.record.properties).toHaveProperty('createdAt');

    // Required fields validation
    expect(schema.defs.main.record.required).toContain('name');
    expect(schema.defs.main.record.required).toContain('hashtag');
    expect(schema.defs.main.record.required).toContain('stage');
  });
});
