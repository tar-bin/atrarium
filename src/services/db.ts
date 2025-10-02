// Atrarium MVP - Database Service Layer
// D1 Sessions API with retry logic and batch operations

import type { Env } from '../types';

// ============================================================================
// Retryable Errors (research.md:162-181)
// ============================================================================

const RETRYABLE_ERRORS = [
  'Network connection lost',
  'storage caused object to be reset',
  'reset because its code was updated',
  'SQLite database is busy',
  'database is locked',
];

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    return RETRYABLE_ERRORS.some((msg) => error.message.includes(msg));
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Execute with Retry (Exponential Backoff)
// ============================================================================

export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 5
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      if (!isRetryableError(err) || attempt === maxAttempts) {
        throw err;
      }

      // Exponential backoff with jitter
      const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      const jitter = Math.random() * 1000;
      await sleep(baseDelay + jitter);
    }
  }

  throw new Error('Max retry attempts exceeded');
}

// ============================================================================
// Database Query Helper (D1 Sessions API)
// ============================================================================

export class DatabaseService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Execute a read query with D1 Sessions API (read replication)
   * @param query SQL query string
   * @param params Query parameters
   * @returns Query results with metadata
   */
  async query<T = unknown>(query: string, ...params: unknown[]): Promise<D1Result<T>> {
    return executeWithRetry(async () => {
      let stmt = this.env.DB.prepare(query);
      if (params.length > 0) {
        stmt = stmt.bind(...params);
      }
      const result = await stmt.all<T>();

      // Log performance metrics in development
      if (this.env.ENVIRONMENT === 'development') {
        console.log('[DB Query]', {
          servedBy: result.meta?.served_by_region,
          duration: result.meta?.duration,
          query: query.substring(0, 100),
        });
      }

      return result;
    });
  }

  /**
   * Execute a single read query and return first result
   */
  async queryOne<T = unknown>(query: string, ...params: unknown[]): Promise<T | null> {
    return executeWithRetry(async () => {
      let stmt = this.env.DB.prepare(query);
      if (params.length > 0) {
        stmt = stmt.bind(...params);
      }
      return await stmt.first<T>();
    });
  }

  /**
   * Execute a write query (INSERT, UPDATE, DELETE)
   */
  async execute(query: string, ...params: unknown[]): Promise<D1Result> {
    return executeWithRetry(async () => {
      let stmt = this.env.DB.prepare(query);
      if (params.length > 0) {
        stmt = stmt.bind(...params);
      }
      return await stmt.run();
    });
  }

  /**
   * Execute multiple queries in a batch (10-11x faster than loop)
   * @param statements Array of prepared statements
   * @returns Array of results
   */
  async batch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
    return executeWithRetry(async () => {
      return await this.env.DB.batch(statements);
    });
  }

  /**
   * Prepare a statement for later execution
   */
  prepare(query: string): D1PreparedStatement {
    return this.env.DB.prepare(query);
  }

  /**
   * Begin a transaction (for complex multi-step operations)
   * Note: D1 transactions are implicit in batch operations
   */
  async transaction<T>(operations: () => Promise<T>): Promise<T> {
    return executeWithRetry(operations);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert snake_case database row to camelCase object
 */
export function toCamelCase<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

/**
 * Convert camelCase object to snake_case for database
 */
export function toSnakeCase<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

/**
 * Parse JSON field from database (e.g., langs array)
 */
export function parseJsonField<T>(value: string | null): T | null {
  if (value === null) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Get current Unix timestamp (seconds)
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Generate UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}
