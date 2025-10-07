# Data Model: Reorganize Implementation into Lexicons, Server, and Client

**Feature**: 011-lexicons-server-client
**Date**: 2025-10-06
**Status**: Complete

## Overview

This feature is a **structural reorganization only**. No new data entities, database schemas, or API contracts are created. All existing data models remain unchanged.

## Existing Data Models (Unchanged)

The following data models exist in the current system and will remain unchanged:

### AT Protocol Lexicon Schemas (lexicons/)

**Location**: `/lexicons/` → **No change**

1. **net.atrarium.community.config**
   - Community metadata (name, hashtag, stage, moderators, feedMix)
   - Stored in user PDS as AT Protocol records

2. **net.atrarium.community.membership**
   - User membership records (community, role, joinedAt, active)
   - Stored in user PDS as AT Protocol records

3. **net.atrarium.moderation.action**
   - Moderation actions (action, target, community, reason)
   - Stored in user PDS as AT Protocol records

### Durable Object Storage Models (server/src/durable-objects/)

**Location**: `/src/durable-objects/` → `/server/src/durable-objects/`

1. **CommunityFeedGenerator Storage**
   - `config:<communityId>`: CommunityConfig
   - `member:<did>`: MembershipRecord
   - `post:<timestamp>:<rkey>`: PostMetadata
   - `moderation:<uri>`: ModerationAction
   - 7-day retention, rebuild from PDS via Firehose

2. **FirehoseReceiver State**
   - WebSocket connection state
   - Cursor position for Jetstream Firehose
   - Lightweight filtering state

### TypeScript Type Definitions (server/src/types.ts)

**Location**: `/src/types.ts` → `/server/src/types.ts`

All TypeScript types remain unchanged:
- `CommunityConfig`
- `MembershipRecord`
- `ModerationAction`
- `PostMetadata`
- `PostEvent`
- API request/response types

### Client Data Models (client/)

**Location**: `/dashboard/src/types/` → `/client/dashboard/src/types/`

Dashboard-specific types (unchanged):
- Community view models
- Form state types
- UI component props

## Directory Structure Changes

This reorganization affects **file locations only**, not data schemas:

### Before
```
/workspaces/atrarium/
├── lexicons/                    # Protocol definitions
│   └── net.atrarium.*.json
├── src/                         # Server implementation
│   ├── types.ts                 # Server types
│   └── ...
├── tests/                       # Server tests
└── dashboard/                   # Client implementation
    └── src/types/               # Client types
```

### After
```
/workspaces/atrarium/
├── lexicons/                    # Protocol definitions (unchanged)
│   └── net.atrarium.*.json
├── server/                      # Server implementation (moved)
│   ├── src/
│   │   ├── types.ts             # Server types (moved)
│   │   └── ...
│   └── tests/                   # Server tests (moved)
└── client/                      # Client implementation (grouped)
    └── dashboard/
        └── src/types/           # Client types (moved)
```

## Impact Analysis

### No Changes Required
- ✅ Lexicon schemas (protocol definitions)
- ✅ PDS storage (AT Protocol records)
- ✅ Durable Object storage keys/values
- ✅ API request/response formats
- ✅ Database schemas (none exist, uses Durable Objects)
- ✅ Type definitions (content unchanged)

### Import Path Updates Required
- ⚠️ Server files: `from "../types"` → relative to new location
- ⚠️ Client files: `from "../types"` → relative to new location
- ⚠️ Test files: Update imports to match new structure

### Configuration Updates Required
- ⚠️ `tsconfig.json`: Update paths and project references
- ⚠️ `vitest.config.ts`: Update test file paths
- ⚠️ `wrangler.toml`: Update entry point path (if moved)

## Validation

### Data Integrity Checks
No data migration required. Validation focuses on functionality preservation:

1. **Type Checking**: `npm run typecheck` must pass
2. **Test Suite**: All tests must pass (contract + integration + unit)
3. **Build**: `npm run build` must succeed for all workspaces

### Rollback Plan
If issues occur:
1. `git revert <commit>` - Single commit rollback
2. Restore original structure
3. No data loss risk (no data changes)

## Summary

This feature is a **pure structural reorganization**:
- ✅ No new data entities
- ✅ No schema changes
- ✅ No API changes
- ✅ No storage changes
- ⚠️ Only file locations and import paths change

**Constitutional Compliance**:
- ✅ Principle 1: Protocol-first architecture preserved (Lexicons unchanged)
- ✅ Principle 2: Simplicity maintained (no new databases/services)
- ✅ Principle 4-5: PDS-first architecture unchanged
- ✅ No data ownership or storage changes
