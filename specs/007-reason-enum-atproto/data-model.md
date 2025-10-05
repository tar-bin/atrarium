# Data Model: Moderation Reason Enum

**Feature**: 007-reason-enum-atproto
**Date**: 2025-10-05

## Overview

This document defines the data structures and validation rules for the enum-based moderation reason system. The primary change is replacing the free-text `reason` field in `net.atrarium.moderation.action` Lexicon schema with a predefined enum.

## Enum Definition

### ModerationReason

**Purpose**: Standardized, privacy-safe moderation reason codes for public PDS records.

**Values** (17 total):

| Enum Value | EN Label | JA Label | Category |
|-----------|----------|----------|----------|
| `spam` | Spam post | スパム投稿 | Spam/Low Quality |
| `low_quality` | Low-quality content | 低品質コンテンツ | Spam/Low Quality |
| `duplicate` | Duplicate post | 重複投稿 | Spam/Low Quality |
| `off_topic` | Off-topic content | トピック外のコンテンツ | Off-Topic |
| `wrong_community` | Posted in wrong community | 誤ったコミュニティへの投稿 | Off-Topic |
| `guidelines_violation` | Community guidelines violation | コミュニティガイドライン違反 | Policy Violations |
| `terms_violation` | Terms of service violation | 利用規約違反 | Policy Violations |
| `copyright` | Copyright infringement | 著作権侵害 | Policy Violations |
| `harassment` | Harassment or bullying | ハラスメントまたはいじめ | Harmful Content |
| `hate_speech` | Hate speech | ヘイトスピーチ | Harmful Content |
| `violence` | Violence or threats | 暴力または脅迫 | Harmful Content |
| `nsfw` | NSFW content | NSFWコンテンツ | Harmful Content |
| `illegal_content` | Illegal content | 違法コンテンツ | Harmful Content |
| `bot_activity` | Automated bot activity | 自動ボット活動 | User Behavior |
| `impersonation` | Impersonation | なりすまし | User Behavior |
| `ban_evasion` | Ban evasion | BANの回避 | User Behavior |
| `other` | Other reason | その他の理由 | Other |

**Categorization** (for future UI grouping):
- **Spam/Low Quality**: `spam`, `low_quality`, `duplicate`
- **Off-Topic**: `off_topic`, `wrong_community`
- **Policy Violations**: `guidelines_violation`, `terms_violation`, `copyright`
- **Harmful Content**: `harassment`, `hate_speech`, `violence`, `nsfw`, `illegal_content`
- **User Behavior**: `bot_activity`, `impersonation`, `ban_evasion`
- **Other**: `other`

### TypeScript Type Definition

```typescript
// src/schemas/lexicon.ts
export const MODERATION_REASONS = [
  'spam',
  'low_quality',
  'duplicate',
  'off_topic',
  'wrong_community',
  'guidelines_violation',
  'terms_violation',
  'copyright',
  'harassment',
  'hate_speech',
  'violence',
  'nsfw',
  'illegal_content',
  'bot_activity',
  'impersonation',
  'ban_evasion',
  'other',
] as const;

export type ModerationReason = typeof MODERATION_REASONS[number];
```

### Zod Schema

```typescript
// src/schemas/lexicon.ts
import { z } from 'zod';

export const moderationReasonSchema = z.enum(MODERATION_REASONS).optional();

// Usage in ModerationAction validation
export const moderationActionSchema = z.object({
  action: z.enum(['hide_post', 'unhide_post', 'block_user', 'unblock_user']),
  target: z.string(), // AT-URI or DID
  community: z.string().startsWith('at://'), // AT-URI
  reason: moderationReasonSchema,
  createdAt: z.string().datetime(),
});
```

## Updated Entities

### ModerationAction (AT Protocol Lexicon Record)

**Schema**: `net.atrarium.moderation.action`
**Storage**: Moderator's Personal Data Server (PDS)
**Visibility**: Public (anyone can read from PDS)

**Changes**:
- ❌ **Before**: `reason?: string` (free-text, max 4000 chars)
- ✅ **After**: `reason?: ModerationReason` (enum, one of 17 values)

**Full Schema Definition**:

```json
{
  "lexicon": 1,
  "id": "net.atrarium.moderation.action",
  "defs": {
    "main": {
      "type": "record",
      "description": "Moderation action record stored in the moderator's Personal Data Server (PDS). Records moderation decisions (hide/unhide posts, block/unblock users) for a specific community.",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["action", "target", "community", "createdAt"],
        "properties": {
          "action": {
            "type": "string",
            "description": "Type of moderation action",
            "enum": ["hide_post", "unhide_post", "block_user", "unblock_user"]
          },
          "target": {
            "type": "union",
            "description": "Target of the moderation action (post or user)",
            "refs": ["#postTarget", "#userTarget"]
          },
          "community": {
            "type": "string",
            "format": "at-uri",
            "description": "AT-URI of the community where this action applies"
          },
          "reason": {
            "type": "string",
            "description": "Predefined reason for the moderation action (PUBLIC record - no PII)",
            "enum": [
              "spam",
              "low_quality",
              "duplicate",
              "off_topic",
              "wrong_community",
              "guidelines_violation",
              "terms_violation",
              "copyright",
              "harassment",
              "hate_speech",
              "violence",
              "nsfw",
              "illegal_content",
              "bot_activity",
              "impersonation",
              "ban_evasion",
              "other"
            ]
          },
          "createdAt": {
            "type": "string",
            "format": "datetime",
            "description": "Action timestamp (ISO 8601)"
          }
        }
      }
    },
    "postTarget": {
      "type": "object",
      "description": "Post being moderated (uses strongRef for immutability)",
      "required": ["uri", "cid"],
      "properties": {
        "uri": {
          "type": "string",
          "format": "at-uri",
          "description": "AT-URI of the post (at://did:plc:author/app.bsky.feed.post/rkey)"
        },
        "cid": {
          "type": "string",
          "format": "cid",
          "description": "Content identifier (CID) of the post record"
        }
      }
    },
    "userTarget": {
      "type": "object",
      "description": "User being moderated",
      "required": ["did"],
      "properties": {
        "did": {
          "type": "string",
          "format": "did",
          "description": "DID of the user being blocked/unblocked"
        }
      }
    }
  }
}
```

**Example PDS Record** (After):
```json
{
  "$type": "net.atrarium.moderation.action",
  "action": "hide_post",
  "target": {
    "uri": "at://did:plc:bob123/app.bsky.feed.post/3jzfcijpj2z2a",
    "cid": "bafyreib2rxk3rh6kzwq"
  },
  "community": "at://did:plc:alice456/net.atrarium.community.config/3k2j4xyz",
  "reason": "spam",
  "createdAt": "2025-10-05T12:34:56.789Z"
}
```

**AT-URI Format**: `at://did:plc:moderator/net.atrarium.moderation.action/{rkey}`

## Validation Rules

### Backend Validation (API Layer)

**File**: `src/routes/moderation.ts`

**Function**: `validateModerationReason(reason?: string)`

```typescript
function validateModerationReason(reason?: string): { valid: boolean; error?: string } {
  if (!reason || reason.trim() === '') {
    return { valid: true }; // Optional field
  }

  if (!MODERATION_REASONS.includes(reason as ModerationReason)) {
    return {
      valid: false,
      error: `Invalid reason. Must be one of: ${MODERATION_REASONS.join(', ')}`,
    };
  }

  return { valid: true };
}
```

**Changes from Current Implementation**:
- ❌ **Remove**: 83 lines of regex-based PII validation (email, phone, URL, keywords)
- ✅ **Add**: 10 lines of enum validation (array membership check)
- ✅ **Benefit**: Faster (O(1) vs O(n) regex), zero privacy risk

### Frontend Validation (UI Layer)

**File**: `dashboard/src/components/moderation/ModerationReasonSelect.tsx`

**Validation Strategy**: Prevent invalid input via UI constraints (dropdown)

```typescript
// Component enforces enum values via <Select> component
// No free-text input possible → validation unnecessary
export function ModerationReasonSelect({ value, onChange }: Props) {
  // User can only select from MODERATION_REASONS array
  // Invalid values cannot be submitted
}
```

**Additional Validation** (form submission):
```typescript
// react-hook-form + Zod schema
const formSchema = z.object({
  reason: moderationReasonSchema, // Uses Zod enum from src/schemas/lexicon.ts
});
```

## Internationalization (i18n)

### Label Storage

**Files**:
- `dashboard/src/i18n/locales/en/moderation.json` (English labels)
- `dashboard/src/i18n/locales/ja/moderation.json` (Japanese labels)

**Structure**:
```json
{
  "selectReason": "Select reason",
  "reasons": {
    "spam": "Spam post",
    "low_quality": "Low-quality content",
    ...
  }
}
```

**Usage**:
```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
const label = t(`moderation.reasons.${reason}`); // "Spam post" or "スパム投稿"
```

### Label Translation Matrix

| Enum Value | EN Label | JA Label |
|-----------|----------|----------|
| spam | Spam post | スパム投稿 |
| low_quality | Low-quality content | 低品質コンテンツ |
| duplicate | Duplicate post | 重複投稿 |
| off_topic | Off-topic content | トピック外のコンテンツ |
| wrong_community | Posted in wrong community | 誤ったコミュニティへの投稿 |
| guidelines_violation | Community guidelines violation | コミュニティガイドライン違反 |
| terms_violation | Terms of service violation | 利用規約違反 |
| copyright | Copyright infringement | 著作権侵害 |
| harassment | Harassment or bullying | ハラスメントまたはいじめ |
| hate_speech | Hate speech | ヘイトスピーチ |
| violence | Violence or threats | 暴力または脅迫 |
| nsfw | NSFW content | NSFWコンテンツ |
| illegal_content | Illegal content | 違法コンテンツ |
| bot_activity | Automated bot activity | 自動ボット活動 |
| impersonation | Impersonation | なりすまし |
| ban_evasion | Ban evasion | BANの回避 |
| other | Other reason | その他の理由 |

**Translation Notes**:
- All labels verified by native Japanese speaker (required before merge)
- Technical terms (NSFW, BAN) remain in English in Japanese version (common practice)

## Backward Compatibility

### Reading Existing Records

**Scenario**: Existing PDS records have free-text reasons (before this feature)

**Strategy**: Accept any string value when reading, no validation

```typescript
// Backend: Read moderation action from PDS
const moderationAction = await atproto.getModerationAction(uri);
// moderationAction.reason may be enum value OR free-text (no validation)

// Frontend: Display reason as-is
<p>Reason: {moderationAction.reason}</p>
// Shows "spam" for new records, "Removed for violating policy" for old records
```

**Migration**: Not required (existing records remain valid)

### Writing New Records

**Scenario**: New moderation actions must use enum values

**Strategy**: Enforce enum validation at API layer

```typescript
// Backend: POST /api/moderation/hide-post
const { reason } = await c.req.json();
const validation = validateModerationReason(reason);
if (!validation.valid) {
  return c.json({ error: 'InvalidReason', message: validation.error }, 400);
}
// Only enum values pass validation
```

## Data Flow

### Moderation Action Creation

```
1. Moderator selects reason from dropdown (e.g., "spam")
   ↓
2. Frontend sends API request: { reason: "spam", postUri, communityId }
   ↓
3. Backend validates: reason ∈ MODERATION_REASONS
   ↓ (if valid)
4. Backend writes to PDS: net.atrarium.moderation.action record
   ↓
5. PDS stores public record with reason: "spam"
   ↓
6. Firehose broadcasts new record
   ↓
7. CommunityFeedGenerator DO updates moderation status
   ↓
8. Post hidden from getFeedSkeleton response
```

### Moderation Log Display

```
1. Frontend requests moderation logs (GET /api/moderation/logs)
   ↓
2. Backend queries PDS for moderation action records
   ↓
3. Returns array of actions (with enum or free-text reasons)
   ↓
4. Frontend displays:
   - Enum values → Translated label (e.g., "spam" → "スパム投稿")
   - Free-text → As-is (backward compat for old records)
```

## Privacy Guarantees

### What Is Protected

✅ **Email addresses**: Cannot be input (enum-only)
✅ **Phone numbers**: Cannot be input (enum-only)
✅ **Names/DIDs of reporters**: Cannot be input (enum-only)
✅ **Internal ticket numbers**: Cannot be input (enum-only)
✅ **Confidential information**: Cannot be input (enum-only)

### What Is Public

⚠️ **Enum value**: Always public (stored in moderator's PDS)
⚠️ **Moderator DID**: Always public (record author)
⚠️ **Target post/user**: Always public (moderation target)
⚠️ **Community**: Always public (context)
⚠️ **Timestamp**: Always public (when action occurred)

### External System Integration

**For Detailed Internal Notes**:
- Moderators use Discord, internal tools, or other private systems
- External notes linked by target URI (not stored in PDS)
- Example: Discord message "Post at://... hidden for spam - related to ticket #12345"

**NOT stored in PDS**:
- Ticket numbers
- Reporter identities
- Internal communications
- Private user reports

## Future Enhancements

### Adding New Enum Values

**Process**:
1. Add value to `MODERATION_REASONS` array (append, don't reorder)
2. Add labels to `en/moderation.json` and `ja/moderation.json`
3. Update Lexicon schema enum list
4. Deploy backend (enum validation accepts new value)
5. Deploy frontend (dropdown shows new option)

**Example**:
```typescript
export const MODERATION_REASONS = [
  // ... existing 17 values
  'misinformation', // NEW
] as const;
```

### Private Notes (Future)

**When AT Protocol supports private encrypted records**:
- Add `privateNotes` field to Durable Objects Storage (NOT in PDS)
- Only moderators can read private notes
- Public record remains enum-only (privacy protection)

**Schema** (future):
```typescript
interface ModerationActionPrivateNotes {
  moderatorDid: string;
  targetUri: string;
  privateNotes?: string; // Encrypted in DO Storage
  relatedTickets?: string[]; // Encrypted in DO Storage
  createdAt: string;
}
```

## Summary

**Key Changes**:
- `reason` field: `string` → `ModerationReason` enum (17 values)
- Validation: Regex PII detection → Enum membership check
- UI: Text input → Dropdown select
- i18n: 34 labels (17 EN + 17 JA)
- Privacy: Medium risk → Zero risk

**Impact**:
- Code: -73 lines (simplification)
- Performance: No change (enum check is faster than regex)
- Privacy: Eliminates input-based PII leakage
- UX: Faster moderation (dropdown vs typing)
