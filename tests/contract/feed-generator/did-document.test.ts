// Contract Test: GET /.well-known/did.json
// Verifies DID document format compliance with AT Protocol

import { describe, it, expect } from 'vitest';
import app from '../../../src/index';
import { createMockEnv } from '../../helpers/test-env';

describe('Contract: GET /.well-known/did.json', () => {
  it('should return valid DID document', async () => {
    const env = createMockEnv();
    const request = new Request('http://localhost:8787/.well-known/did.json');

    const response = await app.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');

    const didDoc = await response.json();

    // Verify DID document structure
    expect(didDoc).toHaveProperty('@context');
    expect(didDoc['@context']).toEqual(['https://www.w3.org/ns/did/v1']);

    expect(didDoc).toHaveProperty('id');
    expect(didDoc.id).toMatch(/^did:web:/);

    expect(didDoc).toHaveProperty('service');
    expect(Array.isArray(didDoc.service)).toBe(true);
    expect(didDoc.service.length).toBeGreaterThan(0);

    const service = didDoc.service[0];
    expect(service).toHaveProperty('id', '#bsky_fg');
    expect(service).toHaveProperty('type', 'BskyFeedGenerator');
    expect(service).toHaveProperty('serviceEndpoint');
    expect(service.serviceEndpoint).toMatch(/^https?:\/\//);
  });

  it('should include Cache-Control header', async () => {
    const env = createMockEnv();
    const request = new Request('http://localhost:8787/.well-known/did.json');

    const response = await app.fetch(request, env, {} as ExecutionContext);

    expect(response.headers.get('Cache-Control')).toBeTruthy();
    expect(response.headers.get('Cache-Control')).toContain('max-age');
  });

  it('should use hostname from request', async () => {
    const env = createMockEnv();
    const request = new Request('http://example.com/.well-known/did.json');

    const response = await app.fetch(request, env, {} as ExecutionContext);
    const didDoc = await response.json();

    expect(didDoc.id).toBe('did:web:example.com');
    expect(didDoc.service[0].serviceEndpoint).toBe('https://example.com');
  });
});
