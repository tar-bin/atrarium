// Atrarium OpenAPI Generator
// Generates OpenAPI specification from oRPC router

import { OpenAPIGenerator } from '@orpc/openapi';
import { ZodToJsonSchemaConverter } from '@orpc/zod';
import { router } from './router';

export function generateOpenAPISpec() {
  const generator = new OpenAPIGenerator({
    schemaConverters: [new ZodToJsonSchemaConverter()],
  });

  return generator.generate(router, {
    info: {
      title: 'Atrarium API',
      version: '0.1.0',
      description: 'Community management system built on AT Protocol (Bluesky)',
    },
    servers: [
      {
        url: 'https://atrarium.net',
        description: 'Production server',
      },
      {
        url: 'http://localhost:8787',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'communities',
        description: 'Community management endpoints',
      },
      {
        name: 'moderation',
        description: 'Moderation endpoints',
      },
    ],
  });
}
