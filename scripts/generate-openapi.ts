// Script to generate and inspect OpenAPI specification

import { generateOpenAPISpec } from '../src/openapi';

async function main() {
  const _spec = await generateOpenAPISpec();
}

main().catch((error) => {
  // biome-ignore lint/suspicious/noConsole: Script execution requires error logging
  console.error(error);
  process.exit(1);
});
