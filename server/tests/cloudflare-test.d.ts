// Type definitions for cloudflare:test module
// Provided by @cloudflare/vitest-pool-workers

declare module 'cloudflare:test' {
  import type { Env } from '../src/types';

  export const env: Env;

  export interface MessageSendRequest<Body = unknown> {
    body: Body;
    contentType?: string;
  }

  export interface MessageBatch<Body = unknown> {
    messages: Array<{
      body: Body;
      id: string;
      timestamp: Date;
    }>;
  }
}
