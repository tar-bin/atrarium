---
title: Setup Guide
description: Getting started with Atrarium installation and deployment
order: 2
---

# Setup Guide

This guide will help you set up Atrarium for local development or production deployment.

## Prerequisites

- **Node.js 18+**: Install from [nodejs.org](https://nodejs.org/)
- **Wrangler CLI**: Cloudflare Workers command-line tool
- **Git**: Version control
- **Cloudflare Account**: Free tier works fine

## Local Development Setup

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
wrangler login  # Authenticate with Cloudflare
```

### 2. Clone Repository

```bash
git clone https://github.com/tar-bin/atrarium.git
cd atrarium
```

### 3. Install Dependencies

```bash
pnpm install

# Initialize Git hooks (pre-commit validation)
pnpm exec husky
```

**Pre-commit Hooks**: The project uses Husky + lint-staged for automated code quality checks. Every commit automatically runs:
- **Biome linting** on staged files (`.ts`, `.tsx`, `.js`, `.jsx`, `.json`)
- **TypeScript type checking** across all workspaces

This ensures compliance with [Project Constitution Principle 7 (Code Quality and Pre-Commit Validation)](.specify/memory/constitution.md#principle-7-code-quality-and-pre-commit-validation).

### 4. Create Cloudflare Resources

```bash
# Create Cloudflare Queues (for Firehose event processing)
wrangler queues create firehose-events
wrangler queues create firehose-dlq  # Dead letter queue

# Durable Objects are automatically provisioned on first deploy
```

### 5. Set Secrets

```bash
# JWT secret for authentication
wrangler secret put JWT_SECRET

# Optional: Bluesky credentials (for testing)
wrangler secret put BLUESKY_HANDLE
wrangler secret put BLUESKY_APP_PASSWORD
```

### 6. Run Development Server

```bash
# Start server only
pnpm --filter server dev

# Start server + dashboard in parallel
./start-dev.sh  # Or manually: pnpm --filter server dev & pnpm --filter client dev
```

**Server**: `http://localhost:8787` (Feed Generator API)
**Dashboard**: `http://localhost:5173` (React web UI)

## Production Deployment

### 1. Build and Deploy

```bash
# Deploy server (Cloudflare Workers)
pnpm --filter server deploy

# Deploy dashboard (Cloudflare Pages)
# Recommended: Use GitHub integration
# - Build command: cd client && pnpm install && pnpm run build
# - Build output: client/dist
# - Environment variables: VITE_API_URL, VITE_PDS_URL
```

### 2. Verify Deployment

Check the DID document endpoint:

```bash
curl https://your-worker.workers.dev/.well-known/did.json
```

### 3. Register Feed Generator

Follow AT Protocol's [Feed Generator registration guide](https://docs.bsky.app/docs/starter-templates/custom-feeds) to publish your feed.

## Testing

### Run Tests

```bash
# Run all workspace tests
pnpm -r test

# Run server tests
pnpm --filter server test

# Run tests in watch mode
pnpm --filter server test:watch

# Type checking (all workspaces)
pnpm -r typecheck

# Run PDS integration tests (requires DevContainer)
pnpm --filter server test:pds
```

### Code Quality Checks

```bash
# Run Biome linting
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Check formatting
pnpm format:check
```

**Note**: Pre-commit hooks automatically run these checks on staged files. Manual execution is rarely needed.

## Common Commands

### Development

```bash
# Start parallel development (server + dashboard)
./start-dev.sh

# Start server only
pnpm --filter server dev

# Start dashboard only
pnpm --filter client dev

# Generate TypeScript from Lexicons
pnpm --filter server codegen
```

### Monitoring

```bash
# View live logs
wrangler tail

# View logs with formatting
wrangler tail --format pretty

# Filter by Durable Object
wrangler tail --format json | grep "CommunityFeedGenerator"

# Filter by Queue Consumer
wrangler tail --format json | grep "FirehoseProcessor"
```

## Troubleshooting

### Pre-commit hooks fail
- **Biome linting errors**: Run `pnpm lint:fix` to auto-fix issues
- **TypeScript errors**: Run `pnpm -r typecheck` to identify type issues
- **Hook not executing**: Run `pnpm exec husky` to reinstall hooks

### Module not found errors
- Run `pnpm install` again (not `npm install`)
- Clear node_modules and reinstall: `rm -rf node_modules && pnpm install`

### Authentication errors
- Verify secrets are set: `wrangler secret list`
- Check JWT_SECRET is configured

### Build fails
- Run typecheck: `pnpm -r typecheck`
- Check for syntax errors in TypeScript files
- Verify Biome linting passes: `pnpm lint`

### Durable Objects not responding
- Check logs: `wrangler tail --format pretty | grep "CommunityFeedGenerator"`
- Verify Durable Objects bindings in [wrangler.toml](server/wrangler.toml)

### Queue processing delays
- Check Queue consumer logs: `wrangler tail --format pretty | grep "FirehoseProcessor"`
- Monitor dead letter queue: `wrangler queues consumer add firehose-dlq`

## Next Steps

- [QUICKSTART.md](QUICKSTART.md) - Getting started guide
- [CONCEPT.md](CONCEPT.md) - System design and architecture
- [CLAUDE.md](CLAUDE.md) - Development guidelines
- [Project Constitution](.specify/memory/constitution.md) - Architectural principles
