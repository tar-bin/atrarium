/**
 * Common Validation Utilities
 *
 * Shared validation functions for both server and client
 */

/**
 * Placeholder for future validation utilities
 * This file is reserved for common validation functions that don't fit into
 * emoji.ts or hashtag.ts
 */

export function validateDID(did: string): boolean {
  // Basic DID format validation (did:plc:... or did:web:...)
  return /^did:(plc|web):[a-zA-Z0-9._-]+$/.test(did);
}
