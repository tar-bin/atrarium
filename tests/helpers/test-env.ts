// Test environment helpers
import type { Env } from '../../src/types';

/**
 * Create mock environment for tests
 */
export function createMockEnv(): Env {
  return {
    DB: {} as D1Database, // Will be provided by Miniflare
    POST_CACHE: {} as KVNamespace, // Will be provided by Miniflare
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

/**
 * Setup test database with schema
 */
export async function setupTestDatabase(db: D1Database): Promise<void> {
  // Read schema from file
  const fs = await import('fs/promises');
  const path = await import('path');

  const schemaPath = path.join(process.cwd(), 'schema.sql');
  const schema = await fs.readFile(schemaPath, 'utf-8');

  // Execute schema (split by semicolon and execute each statement)
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    await db.prepare(statement).run();
  }
}
