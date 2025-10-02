// Atrarium MVP - Main entry point
// Cloudflare Workers handler

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return new Response('Atrarium MVP - Coming soon', { status: 200 });
  },
};

// Types will be defined in src/types.ts
export interface Env {
  DB: D1Database;
  POST_CACHE: KVNamespace;
  JWT_SECRET: string;
  BLUESKY_HANDLE?: string;
  BLUESKY_APP_PASSWORD?: string;
  ENVIRONMENT?: string;
}
