// Atrarium MVP - DID Document Generator
// did:web document generation with hostname validation

import type { DIDDocument } from '../types';

// ============================================================================
// DID Document Generator
// ============================================================================

/**
 * Generate DID document for did:web method
 * @param hostname Service hostname (from request)
 * @returns DID document
 */
export function generateDIDDocument(hostname: string): DIDDocument {
  // Validate hostname
  if (!isValidHostname(hostname)) {
    throw new Error('Invalid hostname');
  }

  // Remove port from hostname for DID (did:web doesn't include ports)
  const hostWithoutPort = hostname.split(':')[0];

  return {
    '@context': ['https://www.w3.org/ns/did/v1'],
    id: `did:web:${hostWithoutPort}`,
    service: [
      {
        id: '#bsky_fg',
        type: 'BskyFeedGenerator',
        serviceEndpoint: `https://${hostname}`,
      },
    ],
  };
}

/**
 * Extract hostname from request URL
 */
export function extractHostname(request: Request): string {
  const url = new URL(request.url);
  return url.hostname + (url.port ? `:${url.port}` : '');
}

/**
 * Validate hostname format
 */
function isValidHostname(hostname: string): boolean {
  // Allow localhost with port for development
  if (hostname.startsWith('localhost') || hostname.startsWith('127.0.0.1')) {
    return true;
  }

  // Production hostname pattern
  const hostnamePattern = /^([a-z0-9-]+\.)*[a-z0-9-]+\.[a-z]{2,}(:\d+)?$/i;
  return hostnamePattern.test(hostname);
}

/**
 * Get feed URI for a theme feed
 * @param did Service DID
 * @param feedId Theme feed ID
 * @returns Feed URI (at://did:web:example.com/app.bsky.feed.generator/feed-id)
 */
export function getFeedUri(did: string, feedId: string): string {
  return `at://${did}/app.bsky.feed.generator/${feedId}`;
}

/**
 * Parse feed URI and extract DID and feed ID
 */
export function parseFeedUri(feedUri: string): { did: string; feedId: string } | null {
  const pattern = /^at:\/\/(did:web:[^/]+)\/app\.bsky\.feed\.generator\/(.+)$/;
  const match = feedUri.match(pattern);

  if (!match) return null;

  return {
    did: match[1],
    feedId: match[2],
  };
}
