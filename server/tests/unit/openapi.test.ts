// Unit tests for OpenAPI specification generation

import { describe, it, expect } from 'vitest';
import { generateOpenAPISpec } from '../../src/openapi';

describe('OpenAPI Specification', () => {
  it('should generate valid OpenAPI spec', async () => {
    const spec = await generateOpenAPISpec();

    // Check basic structure
    expect(spec).toHaveProperty('openapi');
    expect(spec).toHaveProperty('info');
    expect(spec).toHaveProperty('paths');

    // Check info section
    expect(spec.info.title).toBe('Atrarium API');
    expect(spec.info.version).toBe('0.1.0');

    // Check servers
    expect(spec.servers).toHaveLength(2);
    expect(spec.servers?.[0]?.url).toBe('https://atrarium.net');
    expect(spec.servers?.[1]?.url).toBe('http://localhost:8787');
  });

  it('should include communities endpoints', async () => {
    const spec = await generateOpenAPISpec();

    // Check if paths exist
    expect(spec.paths).toBeDefined();
    expect(Object.keys(spec.paths || {})).toContain('/api/communities');
    expect(Object.keys(spec.paths || {})).toContain('/api/communities/:id');

    // Check HTTP methods
    const communitiesPath = spec.paths?.['/api/communities'];
    expect(communitiesPath).toHaveProperty('get');
    expect(communitiesPath).toHaveProperty('post');

    const communityIdPath = spec.paths?.['/api/communities/:id'];
    expect(communityIdPath).toHaveProperty('get');
  });

  it('should include response schemas', async () => {
    const spec = await generateOpenAPISpec();

    // Check if paths with schemas exist
    const listPath = spec.paths?.['/api/communities']?.get;
    expect(listPath?.responses?.['200']).toBeDefined();

    const createPath = spec.paths?.['/api/communities']?.post;
    expect(createPath?.responses?.['200']).toBeDefined();

    // Check schema structure in response
    const listResponse = listPath?.responses?.['200'];
    if (listResponse && 'content' in listResponse) {
      const listSchema = listResponse.content?.['application/json']?.schema;
      expect(listSchema).toBeDefined();
      expect(listSchema).toHaveProperty('type', 'object');
    }
  });
});
