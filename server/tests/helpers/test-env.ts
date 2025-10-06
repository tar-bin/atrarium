// Test environment helpers
import { env } from 'cloudflare:test';
import type { Env } from '../../src/types';

/**
 * Create mock environment for tests
 * Note: Uses real Miniflare bindings from cloudflare:test
 */
export function createMockEnv(): Env {
  return {
    COMMUNITY_FEED: env.COMMUNITY_FEED,
    FIREHOSE_RECEIVER: env.FIREHOSE_RECEIVER,
    FIREHOSE_EVENTS: env.FIREHOSE_EVENTS,
    JWT_SECRET: 'test-secret-key-for-testing-only-not-for-production',
    ENVIRONMENT: 'test',
  };
}

/**
 * Create mock JWT token for testing
 */
export async function createMockJWT(userDid: string, handle: string): Promise<string> {
  const { SignJWT } = await import('jose');
  const secret = new TextEncoder().encode('test-secret-key-for-testing-only-not-for-production');

  const now = Math.floor(Date.now() / 1000);

  return await new SignJWT({
    iss: 'did:web:test.example.com',
    sub: userDid,
    aud: 'did:web:test.example.com',
    handle,
    iat: now,
    exp: now + 900, // 15 minutes
    jti: crypto.randomUUID(),
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .sign(secret);
}

