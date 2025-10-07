// Script to generate and inspect OpenAPI specification

import { generateOpenAPISpec } from '../src/openapi';

async function main() {
  const _spec = await generateOpenAPISpec();
}

main().catch(console.error);
