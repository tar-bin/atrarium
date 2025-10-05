// Script to generate and inspect OpenAPI specification

import { generateOpenAPISpec } from '../src/openapi';

async function main() {
  const spec = await generateOpenAPISpec();
  console.log(JSON.stringify(spec, null, 2));
}

main().catch(console.error);
