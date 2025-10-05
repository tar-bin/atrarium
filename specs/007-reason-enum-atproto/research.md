# Research: Moderation Reason Enum (Privacy-Focused)

**Feature**: 007-reason-enum-atproto
**Date**: 2025-10-05
**Status**: Complete

## Research Summary

All technical decisions are resolved based on existing codebase patterns and prior design work ([moderation-reason-enum-proposal.md](../006-pds-1-db/design/moderation-reason-enum-proposal.md)). No additional research required.

## Technical Decisions

### 1. Enum Pattern in AT Protocol Lexicon

**Decision**: Use standard AT Protocol enum syntax in JSON schema

**Rationale**:
- AT Protocol Lexicon natively supports enum constraints via JSON schema
- Ensures compatibility with AT Protocol validators and PDS implementations
- Follows established patterns in existing Lexicon schemas

**Reference Implementation**:
```json
{
  "reason": {
    "type": "string",
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
    ],
    "description": "Predefined reason for moderation action (public record)"
  }
}
```

**Alternatives Considered**:
- ❌ Custom validation layer: Adds complexity, not standard AT Protocol
- ❌ Free-text with stricter regex: Still has privacy risk, can't catch all PII

**Source**: Existing Lexicon schemas in `specs/006-pds-1-db/contracts/lexicon/`

---

### 2. Enum Validation in TypeScript

**Decision**: Use `const` array + `typeof` for type inference + Zod enum schema

**Rationale**:
- Zod `z.enum()` requires tuple type (not string[])
- `as const` assertion provides tuple type for TypeScript inference
- Single source of truth for enum values (shared between types and validation)

**Reference Implementation**:
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

export const moderationReasonSchema = z.enum(MODERATION_REASONS).optional();
```

**Alternatives Considered**:
- ❌ Manual enum type: Requires duplicating values (violates DRY)
- ❌ String union: Loses runtime validation capability

**Source**: Existing validation patterns in `src/schemas/validation.ts`

---

### 3. React Dropdown Component

**Decision**: Use shadcn/ui `<Select>` component (already in project)

**Rationale**:
- Consistent with existing UI patterns (e.g., feed creation forms)
- Accessible (Radix UI primitives with ARIA support)
- Supports keyboard navigation, search, and custom styling

**Reference Implementation**:
```typescript
// dashboard/src/components/moderation/ModerationReasonSelect.tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { MODERATION_REASONS } from '@/lib/moderation';

export function ModerationReasonSelect({ value, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={t('moderation.selectReason')} />
      </SelectTrigger>
      <SelectContent>
        {MODERATION_REASONS.map((reason) => (
          <SelectItem key={reason} value={reason}>
            {t(`moderation.reasons.${reason}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

**Alternatives Considered**:
- ❌ Native `<select>`: Limited styling, poor mobile UX
- ❌ Custom dropdown: Reinvents the wheel, accessibility concerns
- ❌ Radio buttons: Takes too much vertical space (17 options)

**Source**: Existing select usage in `dashboard/src/components/feeds/CreateFeedModal.tsx`

---

### 4. i18n for Enum Labels

**Decision**: Store labels in `i18n/locales/{lang}/moderation.json` with nested structure

**Rationale**:
- Follows existing i18n structure (flat files per namespace)
- Enables dynamic translation lookup via `t('moderation.reasons.{reason}')`
- Keeps enum values in code, human-readable labels in translation files

**Reference Implementation**:
```json
// dashboard/src/i18n/locales/en/moderation.json
{
  "selectReason": "Select reason",
  "reasons": {
    "spam": "Spam post",
    "low_quality": "Low-quality content",
    "duplicate": "Duplicate post",
    "off_topic": "Off-topic content",
    "wrong_community": "Posted in wrong community",
    "guidelines_violation": "Community guidelines violation",
    "terms_violation": "Terms of service violation",
    "copyright": "Copyright infringement",
    "harassment": "Harassment or bullying",
    "hate_speech": "Hate speech",
    "violence": "Violence or threats",
    "nsfw": "NSFW content",
    "illegal_content": "Illegal content",
    "bot_activity": "Automated bot activity",
    "impersonation": "Impersonation",
    "ban_evasion": "Ban evasion",
    "other": "Other reason"
  }
}

// dashboard/src/i18n/locales/ja/moderation.json
{
  "selectReason": "理由を選択",
  "reasons": {
    "spam": "スパム投稿",
    "low_quality": "低品質コンテンツ",
    "duplicate": "重複投稿",
    "off_topic": "トピック外のコンテンツ",
    "wrong_community": "誤ったコミュニティへの投稿",
    "guidelines_violation": "コミュニティガイドライン違反",
    "terms_violation": "利用規約違反",
    "copyright": "著作権侵害",
    "harassment": "ハラスメントまたはいじめ",
    "hate_speech": "ヘイトスピーチ",
    "violence": "暴力または脅迫",
    "nsfw": "NSFWコンテンツ",
    "illegal_content": "違法コンテンツ",
    "bot_activity": "自動ボット活動",
    "impersonation": "なりすまし",
    "ban_evasion": "BANの回避",
    "other": "その他の理由"
  }
}
```

**Alternatives Considered**:
- ❌ Hardcoded labels in component: Not translatable
- ❌ Labels in Lexicon schema: Schema values should be machine-readable, not human-readable
- ❌ Separate label mapping object: Duplicates structure, i18n already provides this

**Source**: Existing translation files in `dashboard/src/i18n/locales/`

---

### 5. Backward Compatibility

**Decision**: Accept existing free-text reasons (read-only), enforce enum for new actions

**Rationale**:
- AT Protocol records are immutable once published to PDS
- Cannot retroactively change existing moderation action records
- Validation only applies to new API requests, not existing PDS data

**Implementation Strategy**:
1. **API Layer**: Enforce enum validation for incoming requests (`POST /api/moderation/hide-post`)
2. **PDS Read Layer**: Accept any string value when reading existing moderation actions (no validation)
3. **UI Layer**: Display free-text reasons as-is for old records, use dropdown for new actions

**Migration Plan**:
- Phase 1: Add enum validation (this feature)
- Phase 2: No migration needed - existing records remain valid
- Phase 3: Future monitoring - track usage of enum values vs free-text (analytics)

**Alternatives Considered**:
- ❌ Migrate existing records: Not possible (AT Protocol immutability)
- ❌ Reject old records in UI: Poor UX, breaks existing functionality
- ❌ Dual validation (enum OR free-text): Defeats privacy protection goal

**Source**: AT Protocol immutability constraints (core protocol design)

---

## Privacy Context

**Problem**: Free-text `reason` field creates privacy risks in public PDS records

**Examples of Privacy Leaks**:
- ✅ Good (enum): `"reason": "spam"` → Safe, no PII
- ❌ Bad (free-text): `"reason": "Removed based on report from user@example.com"` → Email exposed
- ❌ Bad (free-text): `"reason": "User John Doe violated policy (ticket #12345)"` → Name + internal ticket
- ❌ Bad (free-text): `"reason": "Contact +1-555-123-4567 for details"` → Phone number

**Current Mitigation (Before This Feature)**:
- Regex-based validation detects emails, phone numbers, URLs, sensitive keywords
- **Limitation**: Cannot catch all PII patterns (e.g., "User John Doe reported this")
- 83 lines of complex validation logic

**New Approach (After This Feature)**:
- Enum-only validation (10 lines)
- **Zero privacy risk**: No free-text input possible
- Moderators use external systems (Discord, internal tools) for detailed notes

**AT Protocol Context**:
- All records in PDS are PUBLIC (anyone can read)
- Private/encrypted data support planned for 2025 but not yet available
- Source: [TechCrunch article](https://techcrunch.com/2025/03/26/whats-next-for-atproto-the-protocol-powering-bluesky-and-other-apps/), March 2025

---

## Performance Impact

**Expected Changes**:
- API latency: **No change** (enum validation is O(1) hash lookup, faster than regex)
- Client bundle size: **+2KB** (17 enum values + labels in 2 languages)
- Backend code: **-73 lines** (remove regex logic, add enum check)
- Memory: **Negligible** (enum array is ~500 bytes)

**Validation Comparison**:
```typescript
// Before: Regex-based (slow, ~10-20ms per validation)
function validateModerationReason(reason?: string): { valid: boolean; error?: string } {
  if (!reason) return { valid: true };
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phonePattern = /(\+?\d{1,4}[-.\s()]?)?\d{3,4}[-.\s()]?\d{3,4}[-.\s]?\d{4,}/;
  // ... 83 lines of regex checks
}

// After: Enum check (fast, <1ms)
function validateModerationReason(reason?: string): { valid: boolean; error?: string } {
  if (!reason) return { valid: true };
  if (!MODERATION_REASONS.includes(reason as ModerationReason)) {
    return { valid: false, error: `Invalid reason. Must be one of: ${MODERATION_REASONS.join(', ')}` };
  }
  return { valid: true };
}
```

---

## Testing Strategy

**Contract Tests** (`tests/contract/moderation-reason-enum.test.ts`):
- ✅ Accept valid enum values (all 17 values)
- ✅ Reject invalid enum values (return 400 with clear error message)
- ✅ Accept omitted reason (optional field)
- ✅ All moderation endpoints enforce enum validation

**Unit Tests** (`tests/unit/moderation-reason-validation.test.ts`):
- ✅ Replace regex PII tests with enum validation tests
- ✅ Test Zod schema validation
- ✅ Test TypeScript type inference

**Component Tests** (`dashboard/tests/components/moderation/ModerationReasonSelect.test.ts`):
- ✅ Dropdown renders all 17 options
- ✅ Labels are translated correctly (EN/JA)
- ✅ Selection updates parent component state
- ✅ Keyboard navigation works

**Integration Tests** (`tests/integration/moderation-with-reason.test.ts`):
- ✅ End-to-end flow: Select reason → API call → PDS write → Feed update
- ✅ Verify PDS record contains enum value
- ✅ Verify backward compatibility (read old free-text reasons)

---

## Documentation Requirements

**User-Facing Documentation**:
1. **Dashboard README.md**: Update moderation section with enum dropdown screenshot
2. **VitePress docs**: Update moderation guide with new reason selection flow
3. **Quickstart scenario**: Update Alice-Bob moderation example with enum selection

**Developer Documentation**:
1. **CLAUDE.md**: Add ModerationReason enum to "Key Patterns" section
2. **API Reference**: Update `/api/moderation/hide-post` with enum constraint
3. **Migration Guide**: Document backward compatibility strategy

**Moderator Guidance**:
1. **External Notes Workflow**: Document Discord/internal tools usage for detailed context
2. **Reason Selection Guide**: Best practices for choosing appropriate enum value
3. **Privacy Warning**: Emphasize that reason is PUBLIC (cannot include PII)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Moderators need reason not in enum | Medium | Low | Include `other` as catch-all |
| i18n translation errors | Low | Medium | Peer review all 34 labels (17 × 2 langs) |
| Breaking change for API clients | Low | High | Backward compatible (enum is subset of string) |
| Enum values become stale | Low | Low | Easy to add new values (append to array) |

---

## Conclusion

All technical decisions are resolved. No unknowns or blockers identified.

**Ready for Phase 1**: Design artifacts (data-model.md, contracts/, quickstart.md)
