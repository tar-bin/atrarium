# Testing Guide

## Local Testing (Development Environment)

### Available Tests

**Unit Tests** (✅ Runs locally):
```bash
npm run test:local
```

Tests 18 unit tests covering:
- Feed hashtag generation (`#atr_xxxxxxxx` format)
- Membership validation logic

**Expected output**:
```
✓ tests/unit/feed-hashtag-generator.test.ts (8 tests)
✓ tests/unit/membership-validation.test.ts (10 tests)

Test Files  2 passed (2)
     Tests  18 passed (18)
  Duration  ~14s
```

### Skipped Tests (Require Deployment)

The following tests are **intentionally skipped** in local environment:

**Contract Tests** (⏭️ Requires deployed environment):
- `tests/contract/durable-object-storage.test.ts` - Durable Objects Storage operations
- `tests/contract/queue-consumer.test.ts` - Cloudflare Queue consumer processing

**Integration Tests** (⏭️ Requires deployed environment):
- `tests/integration/queue-to-feed-flow.test.ts` - Queue → Feed flow
- `tests/integration/pds-to-feed-flow.test.ts` - PDS → Feed flow
- `tests/integration/pds-posting.test.ts` - Local PDS integration (requires DevContainer)

**Why skipped?**
- Cloudflare Queues not supported in Miniflare (local test environment)
- Durable Objects Storage isolation issues in local environment
- Real Firehose/Jetstream connection required

### TypeScript Compilation

```bash
npm run typecheck
```

Should complete with **no errors**.

### Documentation Tests

```bash
npm run test:docs
```

Validates VitePress documentation:
- Navigation structure (EN/JA parity)
- i18n completeness
- Link validation
- Build success

---

## Deployed Environment Testing

### Prerequisites

1. Deploy to staging:
```bash
wrangler queues create firehose-events
wrangler queues create firehose-dlq
wrangler deploy --env staging
```

2. Set environment variable:
```bash
export CLOUDFLARE_ENV=staging
```

### Run All Tests

```bash
# Enable skipped tests
sed -i 's/describe.skip/describe/g' tests/contract/*.test.ts
sed -i 's/describe.skip/describe/g' tests/integration/*.test.ts

# Run tests against deployed environment
npm test
```

### Run Specific Test Suites

**Contract Tests**:
```bash
npx vitest run tests/contract/
```

**Integration Tests**:
```bash
npx vitest run tests/integration/
```

**PDS Integration** (requires DevContainer):
```bash
# Start DevContainer with Local PDS
bash .devcontainer/setup-pds.sh

# Run PDS tests
npx vitest run tests/integration/pds-posting.test.ts
```

---

## Manual Validation

See [specs/006-pds-1-db/TESTING.md](specs/006-pds-1-db/TESTING.md) for detailed manual validation steps including:
- Alice creates community scenario
- Bob joins community scenario
- Moderation workflow
- Feed generation verification

---

## Test Architecture

### Current Test Structure

```
tests/
├── unit/                    # ✅ Runs locally
│   ├── feed-hashtag-generator.test.ts
│   └── membership-validation.test.ts
├── contract/                # ⏭️ Requires deployment
│   ├── durable-object-storage.test.ts
│   └── queue-consumer.test.ts
├── integration/             # ⏭️ Requires deployment
│   ├── pds-posting.test.ts        (DevContainer)
│   ├── pds-to-feed-flow.test.ts   (Deployed)
│   └── queue-to-feed-flow.test.ts (Deployed)
└── docs/                    # ✅ Runs locally
    ├── build.test.ts
    ├── i18n.test.ts
    ├── links.test.ts
    └── navigation.test.ts
```

### Removed Tests (D1-dependent)

The following tests were **removed** during PDS-first migration:
- `tests/integration/community-creation.test.ts`
- `tests/integration/hashtag-indexing-flow.test.ts`
- `tests/integration/moderation-flow.test.ts`
- `tests/integration/post-workflow.test.ts`
- `tests/contract/dashboard/*.test.ts`
- `tests/contract/feed-generator/*.test.ts`

These relied on D1 database which has been completely removed in favor of Durable Objects Storage.

---

## Troubleshooting

### Test Timeout

**Problem**: Tests hang indefinitely
**Cause**: Old D1-dependent tests still present
**Solution**: Already fixed - old tests removed

### Queue Tests Fail Locally

**Problem**: Queue consumer tests fail with "Queue not found"
**Expected**: This is normal - Queues require deployed environment
**Solution**: Run tests after `wrangler deploy`

### Durable Objects Storage Tests Fail

**Problem**: Storage isolation issues in local environment
**Expected**: This is a Miniflare limitation
**Solution**: Run tests in deployed environment

---

## CI/CD Integration

### GitHub Actions (Example)

```yaml
name: Test

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:local  # Unit tests only
      - run: npm run typecheck

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: wrangler deploy --env staging
      - run: npm test  # All tests in deployed environment
```

---

## Summary

- **Local development**: Use `npm run test:local` for fast unit testing
- **Pre-deployment**: Verify `npm run typecheck` passes
- **Post-deployment**: Run full test suite with `npm test`
- **Manual validation**: Follow [specs/006-pds-1-db/TESTING.md](specs/006-pds-1-db/TESTING.md)
