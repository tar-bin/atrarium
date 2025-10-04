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
npm install
```

### 4. Create Cloudflare Resources

```bash
# Create D1 database
wrangler d1 create atrarium-db

# Create KV namespace for post cache
wrangler kv:namespace create POST_CACHE
```

### 5. Configure wrangler.toml

Update `wrangler.toml` with the database and KV IDs from the previous step:

```toml
[[d1_databases]]
binding = "DB"
database_name = "atrarium-db"
database_id = "your-database-id"  # Replace with actual ID

[[kv_namespaces]]
binding = "POST_CACHE"
id = "your-kv-id"  # Replace with actual ID
```

### 6. Apply Database Schema

```bash
wrangler d1 execute atrarium-db --file=./schema.sql
```

### 7. Set Secrets

```bash
# JWT secret for authentication
wrangler secret put JWT_SECRET

# Bluesky credentials (for Firehose access)
wrangler secret put BLUESKY_HANDLE
wrangler secret put BLUESKY_APP_PASSWORD
```

### 8. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:8787` to see the Feed Generator API.

## Production Deployment

### 1. Build and Deploy

```bash
npm run deploy
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
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run typecheck
```

### Seed Test Data

```bash
wrangler d1 execute atrarium-db --file=seeds/test-data.sql
```

## Common Commands

### Database Management

```bash
# Execute SQL query
wrangler d1 execute atrarium-db --command "SELECT * FROM communities"

# View database info
wrangler d1 info atrarium-db
```

### Monitoring

```bash
# View live logs
wrangler tail

# View formatted logs
wrangler tail --format pretty
```

## Troubleshooting

### "Module not found" errors
- Run `npm install` again
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

### D1 database not found
- Check wrangler.toml has correct database_id
- Verify database exists: `wrangler d1 list`

### Authentication errors
- Verify secrets are set: `wrangler secret list`
- Check JWT_SECRET is configured

### Build fails
- Run typecheck: `npm run typecheck`
- Check for syntax errors in TypeScript files

## Next Steps

- [Quickstart Guide](/en/guide/quickstart) - Common tasks and usage patterns
- [System Architecture](/en/architecture/system-design) - Understanding the design
- [API Reference](/en/reference/api-reference) - Endpoint documentation
