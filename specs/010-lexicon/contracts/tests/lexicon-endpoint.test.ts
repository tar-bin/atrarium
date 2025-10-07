// Contract Test: Lexicon Endpoint Accessibility
// Validates that all 3 Lexicon schemas are accessible via HTTP endpoints
// Status: FAILING (no implementation yet - TDD approach)

import { describe, expect, it } from 'vitest';

const BASE_URL = 'http://localhost:8787'; // Cloudflare Workers dev server
const LEXICON_ENDPOINT = '/xrpc/net.atrarium.lexicon.get';

describe('Lexicon Endpoint Contract', () => {
  const schemas = [
    'net.atrarium.community.config',
    'net.atrarium.community.membership',
    'net.atrarium.moderation.action',
  ];

  describe('GET /xrpc/net.atrarium.lexicon.get', () => {
    schemas.forEach((nsid) => {
      it(`should return 200 OK for ${nsid}`, async () => {
        const response = await fetch(`${BASE_URL}${LEXICON_ENDPOINT}?nsid=${nsid}`);

        expect(response.status).toBe(200);
      });

      it(`should return application/json Content-Type for ${nsid}`, async () => {
        const response = await fetch(`${BASE_URL}${LEXICON_ENDPOINT}?nsid=${nsid}`);

        expect(response.headers.get('Content-Type')).toBe('application/json');
      });

      it(`should return valid Lexicon schema for ${nsid}`, async () => {
        const response = await fetch(`${BASE_URL}${LEXICON_ENDPOINT}?nsid=${nsid}`);
        const data = await response.json();

        // Validate AT Protocol Lexicon structure
        expect(data).toHaveProperty('$type', 'com.atproto.lexicon.schema');
        expect(data).toHaveProperty('lexicon', 1);
        expect(data).toHaveProperty('id', nsid);
        expect(data).toHaveProperty('defs');
        expect(data.defs).toHaveProperty('main');
      });

      it(`should include ETag header for ${nsid}`, async () => {
        const response = await fetch(`${BASE_URL}${LEXICON_ENDPOINT}?nsid=${nsid}`);

        const etag = response.headers.get('ETag');
        expect(etag).toBeTruthy();
        expect(etag).toMatch(/^"[a-f0-9]{16}"$/); // Quoted SHA-256 hash (first 16 chars)
      });

      it(`should include Cache-Control header for ${nsid}`, async () => {
        const response = await fetch(`${BASE_URL}${LEXICON_ENDPOINT}?nsid=${nsid}`);

        const cacheControl = response.headers.get('Cache-Control');
        expect(cacheControl).toBeTruthy();
        expect(cacheControl).toMatch(/public/);
        expect(cacheControl).toMatch(/max-age=\d+/);
      });
    });

    it('should return 404 for unknown NSID', async () => {
      const response = await fetch(
        `${BASE_URL}${LEXICON_ENDPOINT}?nsid=net.atrarium.unknown.schema`
      );

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('InvalidRequest');
    });

    it('should include CORS headers', async () => {
      const response = await fetch(
        `${BASE_URL}${LEXICON_ENDPOINT}?nsid=net.atrarium.community.config`
      );

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('should handle CORS preflight (OPTIONS)', async () => {
      const response = await fetch(`${BASE_URL}${LEXICON_ENDPOINT}`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://example-pds.com',
          'Access-Control-Request-Method': 'GET',
        },
      });

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });
  });
});
