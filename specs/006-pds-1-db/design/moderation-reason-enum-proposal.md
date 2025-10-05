# Moderation Reason Enum Proposal

## Problem

The current `reason` field in `net.atrarium.moderation.action` is a free-text string (maxLength: 4000). This creates privacy and security risks:

1. **Privacy Risk**: Moderators may accidentally include PII (emails, phone numbers, names) in public PDS records
2. **Confidential Data Leakage**: Internal reports, ticket numbers, or private communications may be exposed
3. **Validation Limitations**: Regex-based validation can't catch all privacy violations (e.g., "User John Doe reported this")
4. **Inconsistent Moderation**: Free-text makes it hard to analyze moderation patterns or generate statistics

**Current State**: All AT Protocol records are PUBLIC. Private/encrypted data support is planned for 2025 but not yet implemented (source: TechCrunch, March 2025).

## Solution: Predefined Reason Enum

Replace free-text `reason` with a predefined enum of common moderation scenarios.

### Proposed Enum Values

```typescript
enum ModerationReason {
  // Spam/Low Quality
  'spam',                        // Spam post
  'low_quality',                 // Low-quality content
  'duplicate',                   // Duplicate post

  // Off-Topic
  'off_topic',                   // Off-topic content
  'wrong_community',             // Posted in wrong community

  // Policy Violations
  'guidelines_violation',        // Community guidelines violation
  'terms_violation',             // Terms of service violation
  'copyright',                   // Copyright infringement

  // Harmful Content
  'harassment',                  // Harassment or bullying
  'hate_speech',                 // Hate speech
  'violence',                    // Violence or threats
  'nsfw',                        // NSFW content (not allowed)
  'illegal_content',             // Illegal content

  // User Behavior
  'bot_activity',                // Automated bot activity
  'impersonation',               // Impersonation
  'ban_evasion',                 // Ban evasion

  // Other
  'other',                       // Other reason (moderator discretion)
}
```

### Updated Lexicon Schema

```json
{
  "reason": {
    "type": "string",
    "description": "Predefined reason for the moderation action. All reasons are PUBLIC and logged in the moderator's PDS.",
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
  }
}
```

### Backend Validation (TypeScript)

```typescript
const MODERATION_REASONS = [
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

type ModerationReason = typeof MODERATION_REASONS[number];

function validateModerationReason(reason?: string): { valid: boolean; error?: string } {
  if (!reason) {
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

### Dashboard UI (React)

```typescript
// components/moderation/ModerationReasonSelect.tsx
const MODERATION_REASON_LABELS: Record<ModerationReason, { en: string; ja: string }> = {
  spam: { en: 'Spam post', ja: 'スパム投稿' },
  low_quality: { en: 'Low-quality content', ja: '低品質コンテンツ' },
  duplicate: { en: 'Duplicate post', ja: '重複投稿' },
  off_topic: { en: 'Off-topic content', ja: 'トピック外のコンテンツ' },
  wrong_community: { en: 'Posted in wrong community', ja: '誤ったコミュニティへの投稿' },
  guidelines_violation: { en: 'Community guidelines violation', ja: 'コミュニティガイドライン違反' },
  terms_violation: { en: 'Terms of service violation', ja: '利用規約違反' },
  copyright: { en: 'Copyright infringement', ja: '著作権侵害' },
  harassment: { en: 'Harassment or bullying', ja: 'ハラスメントまたはいじめ' },
  hate_speech: { en: 'Hate speech', ja: 'ヘイトスピーチ' },
  violence: { en: 'Violence or threats', ja: '暴力または脅迫' },
  nsfw: { en: 'NSFW content', ja: 'NSFWコンテンツ' },
  illegal_content: { en: 'Illegal content', ja: '違法コンテンツ' },
  bot_activity: { en: 'Automated bot activity', ja: '自動ボット活動' },
  impersonation: { en: 'Impersonation', ja: 'なりすまし' },
  ban_evasion: { en: 'Ban evasion', ja: 'BANの回避' },
  other: { en: 'Other reason', ja: 'その他の理由' },
};

export function ModerationReasonSelect({ value, onChange }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'ja';

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={t('moderation.selectReason')} />
      </SelectTrigger>
      <SelectContent>
        {MODERATION_REASONS.map((reason) => (
          <SelectItem key={reason} value={reason}>
            {MODERATION_REASON_LABELS[reason][lang]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

## Benefits

1. **Zero Privacy Risk**: No PII can be accidentally included
2. **Consistent Moderation**: Standardized reasons enable analytics
3. **Better UX**: Dropdown is faster than typing
4. **i18n Support**: Enum values can be translated without changing data
5. **Future-Proof**: Can add new reasons without breaking existing records

## Migration Path

1. **Phase 1**: Add validation to accept BOTH enum and free-text (backward compatible)
2. **Phase 2**: Dashboard UI uses dropdown (still allows free-text via API)
3. **Phase 3**: Deprecate free-text in API (warn if not in enum)
4. **Phase 4**: Strict enum-only validation

## Trade-offs

**Cons**:
- Less flexibility (can't describe unique situations)
- Requires adding new enum values for new scenarios

**Mitigation**:
- Include `other` as catch-all
- Future: Add optional `notes` field for moderators (stored in Durable Objects Storage, NOT in PDS)

## Future Enhancement: Private Notes

When AT Protocol supports private encrypted data (planned 2025+), add:

```typescript
// Stored in Durable Objects Storage (NOT in public PDS record)
interface ModerationActionPrivateNotes {
  moderatorDid: string;
  targetUri: string;
  privateNotes?: string;  // Internal notes, NOT public
  relatedReports?: string[];  // Ticket IDs, NOT public
  createdAt: string;
}
```

## Recommendation

✅ **Implement enum-based `reason` field now** to eliminate privacy risks.

When AT Protocol private data support is available, migrate internal notes to encrypted private records.
