# Moderation Reasons Reference Guide

**Feature**: 007-reason-enum-atproto
**Purpose**: Comprehensive guide to the 17 predefined moderation reason enum values
**Audience**: Moderators, developers, community managers

---

## Table of Contents

1. [Overview](#overview)
2. [Why Enum-Only? (No Free-Text)](#why-enum-only-no-free-text)
3. [Reason Catalog](#reason-catalog)
4. [Usage Guidelines](#usage-guidelines)
5. [Statistical Analysis](#statistical-analysis)
6. [Adding New Reasons](#adding-new-reasons)

---

## Overview

Atrarium uses **17 predefined moderation reasons** to ensure privacy protection and consistency. Each reason is a short code (e.g., `spam`) that maps to human-readable labels in English and Japanese.

**Key Principle**: All moderation actions are PUBLIC records stored in moderators' Personal Data Servers (PDS). Using enum values instead of free-text prevents accidental leakage of personal information (emails, phone numbers, internal reports).

---

## Why Enum-Only? (No Free-Text)

### The Problem with Free-Text Reasons

**AT Protocol Context**:
- All PDS records are **PUBLIC** (anyone can read them)
- Private/encrypted data support is planned for 2025 but **not yet available**
- Moderators may accidentally include PII in free-text fields

**Real-World Risk Examples**:

| Free-Text Input (❌ DANGEROUS) | Privacy Issue |
|-------------------------------|---------------|
| `"Removed based on report from user@example.com"` | Email address exposed |
| `"User John Doe violated policy (ticket #12345)"` | Name + internal ticket ID exposed |
| `"Contact +1-555-123-4567 for details"` | Phone number exposed |
| `"Alice complained about this in private DM"` | Reporter identity exposed |
| `"See internal Slack thread for context"` | Confidential communication reference |

**Regex Validation Limitations** (Previous Approach):
- 83 lines of complex regex patterns
- Could detect emails, phones, URLs, keywords
- **Could NOT catch**: "User John Doe reported this" (no regex can catch all PII patterns)
- Performance cost: 10-20ms per validation

### The Enum Solution

**How It Works**:
1. Moderator selects from dropdown (e.g., "Spam post" / "スパム投稿")
2. System stores enum value: `"spam"` (not the human-readable label)
3. **No free-text input possible** → Zero privacy risk
4. Validation: Simple array membership check (<1ms)

**Benefits**:

| Aspect | Free-Text (Before) | Enum (After) |
|--------|-------------------|--------------|
| Privacy Risk | Medium (regex can't catch all PII) | **Zero** (no input possible) |
| Validation Complexity | 83 lines of regex | 10 lines of enum check |
| Performance | 10-20ms | <1ms |
| Consistency | Varies by moderator | Standardized |
| i18n Support | Not implemented | Fully localized (EN/JA) |
| Statistical Analysis | Difficult (inconsistent wording) | Easy (predefined categories) |

**What About Detailed Notes?**

Moderators use **external systems** for internal context:

```
✅ Public PDS Record (Safe):
{
  "reason": "spam",
  "target": "at://did:plc:bob123/app.bsky.feed.post/3jzfcijpj2z2a"
}

✅ Private Discord Message (Internal):
"Post at://did:plc:bob123/app.bsky.feed.post/3jzfcijpj2z2a
hidden for spam - related to ticket #12345, reported by Alice"
```

This separation ensures:
- Public records contain only safe enum values
- Internal details stay in private channels (Discord, internal tools)
- Compliance with privacy regulations (GDPR, CCPA)

---

## Reason Catalog

### Category 1: Spam / Low Quality

#### 1. `spam` (スパム投稿 / Spam post)

**Purpose**: Unsolicited advertising, promotional content, or irrelevant links

**When to Use**:
- Commercial spam (product ads, affiliate links)
- Link spam (repeated URLs to external sites)
- Cross-posting same content to multiple communities
- Bot-generated promotional content

**Examples**:
- ✅ "Check out this amazing deal! Visit spam-site.com"
- ✅ User posts same affiliate link in 10 different communities
- ✅ "Buy followers for $5! DM me"
- ❌ Low-quality content without commercial intent → Use `low_quality`
- ❌ Automated posting → Use `bot_activity`

**Severity**: Medium (annoying but not harmful)

**Moderator Action**: Hide post, warn user on first offense

---

#### 2. `low_quality` (低品質コンテンツ / Low-quality content)

**Purpose**: Content that adds no value to the community discussion

**When to Use**:
- Single-word posts ("lol", "w", "nice")
- Unintelligible text (random characters)
- Extremely low-effort contributions
- Off-topic memes without context

**Examples**:
- ✅ Post containing only "w w w w w"
- ✅ "asdfghjkl" (keyboard mashing)
- ✅ Unrelated meme image with no caption
- ❌ Short but meaningful replies ("I agree because...") → Not low quality
- ❌ Spam with commercial intent → Use `spam`

**Severity**: Low (more of a quality standard issue)

**Moderator Action**: Hide post, educate user on community standards

**Moderator Note**: Be careful not to discourage genuine new users. Consider context before using this reason.

---

#### 3. `duplicate` (重複投稿 / Duplicate post)

**Purpose**: Same content posted multiple times (accidental or intentional)

**When to Use**:
- User accidentally submits same post twice
- Topic already discussed in recent thread
- Repost of existing content without adding new perspective

**Examples**:
- ✅ "What's your favorite anime?" posted 3 times in same day
- ✅ User asks same question already answered in pinned FAQ
- ✅ Network error causes double submission
- ❌ Different discussion on same topic → Not duplicate
- ❌ Intentional spam reposting → Use `spam`

**Severity**: Low (often accidental)

**Moderator Action**: Hide duplicate, link to original thread

**Moderator Note**: This is often user error. Provide helpful guidance to original thread.

---

### Category 2: Off-Topic

#### 4. `off_topic` (トピック外のコンテンツ / Off-topic content)

**Purpose**: Content unrelated to the community's theme

**When to Use**:
- Politics in anime community (unless anime is political)
- Recipes in technology community
- Sports discussion in gaming community

**Examples**:
- ✅ Political debate in "Anime General" community
- ✅ Cryptocurrency discussion in "Gardening Tips" community
- ✅ Personal relationship advice in "Python Programming" community
- ❌ Slightly related content → Consider context before using
- ❌ Good content in wrong subcommunity → Use `wrong_community`

**Severity**: Low (no malice, just wrong place)

**Moderator Action**: Hide post, gently redirect to appropriate community

**Moderator Note**: Be flexible with tangentially related content. Community discussions naturally evolve.

---

#### 5. `wrong_community` (誤ったコミュニティへの投稿 / Posted in wrong community)

**Purpose**: Good content, but should be in a different (specific) community

**When to Use**:
- Posting in "Anime General" when "Attack on Titan" community exists
- Beginner question in advanced developer community
- Specific technical issue in general discussion community

**Examples**:
- ✅ Deep AOT analysis in "Anime General" (AOT community exists)
- ✅ "How do I install Python?" in "Advanced ML Engineering"
- ✅ Sale post in general community (marketplace community exists)
- ❌ No better alternative community exists → Use `off_topic`
- ❌ Content is inappropriate anywhere → Different reason

**Severity**: Very Low (helpful redirection)

**Moderator Action**: Hide post, **suggest specific alternative community**

**Moderator Note**: Always include suggestion for where to post. This is educational, not punitive.

---

### Category 3: Policy Violations

#### 6. `guidelines_violation` (コミュニティガイドライン違反 / Community guidelines violation)

**Purpose**: Violates specific community rules (not platform-wide rules)

**When to Use**:
- "No image posts" rule violated
- "English only" community receives Japanese post
- "No self-promotion" rule violated (but not spam)
- Breaking community-specific etiquette rules

**Examples**:
- ✅ Posting memes in "serious discussion only" community
- ✅ Using informal language in "professional networking" community
- ✅ Cross-posting when community rules forbid it
- ❌ Platform-wide rules (TOS) violated → Use `terms_violation`
- ❌ Spam (always against rules) → Use `spam`

**Severity**: Medium (depends on specific guideline)

**Moderator Action**: Hide post, cite specific guideline violated

**Moderator Note**: Quote the specific guideline in external notes (Discord). Public reason is just enum.

---

#### 7. `terms_violation` (利用規約違反 / Terms of service violation)

**Purpose**: Violates Atrarium platform-wide Terms of Service

**When to Use**:
- Using multiple accounts to evade restrictions
- Coordinated inauthentic behavior
- Violating API rate limits deliberately
- Circumventing platform security measures

**Examples**:
- ✅ Creating 10 accounts to mass-upvote own posts
- ✅ Using automation tools against TOS
- ✅ Selling account access
- ❌ Community-specific rules → Use `guidelines_violation`
- ❌ Copyright issues → Use `copyright`

**Severity**: High (platform integrity issue)

**Moderator Action**: Hide post, report to platform administrators

**Moderator Note**: More serious than `guidelines_violation`. May result in account suspension.

---

#### 8. `copyright` (著作権侵害 / Copyright infringement)

**Purpose**: Unauthorized use of copyrighted material

**When to Use**:
- Posting full episodes of anime without permission
- Uploading manga scans
- Sharing pirated music/software
- Using copyrighted images without license

**Examples**:
- ✅ Full episode of anime uploaded to community
- ✅ "Here's the latest manga chapter (scan)" with full images
- ✅ Linking to piracy sites
- ❌ Fair use commentary with short clips → Not infringement
- ❌ Fan art (usually transformative) → Not infringement

**Severity**: High (legal liability)

**Moderator Action**: Remove immediately, document for DMCA compliance

**Moderator Note**: Consult legal team if unsure. Document copyright holder information externally.

---

### Category 4: Harmful Content

#### 9. `harassment` (ハラスメントまたはいじめ / Harassment or bullying)

**Purpose**: Targeted attacks on specific individuals

**When to Use**:
- Personal attacks on community members
- Persistent negative targeting of one person
- Doxxing (sharing personal information)
- Coordinated pile-on harassment

**Examples**:
- ✅ "User X is an idiot and should leave this community"
- ✅ Posting someone's address or phone number
- ✅ "Everyone report User X for [false reason]"
- ❌ General rudeness without targeting → `guidelines_violation`
- ❌ Group-based hate → Use `hate_speech`

**Severity**: Critical (safety issue)

**Moderator Action**: Remove immediately, warn or suspend user, document incident

**Moderator Note**: Contact targeted user to offer support. Document in external system for potential escalation.

---

#### 10. `hate_speech` (ヘイトスピーチ / Hate speech)

**Purpose**: Discrimination based on protected characteristics

**When to Use**:
- Racial slurs or stereotypes
- Gender-based discrimination
- Religious intolerance
- LGBTQ+ hate speech
- Disability discrimination
- Ethnic or national origin attacks

**Examples**:
- ✅ Racial slurs or degrading stereotypes
- ✅ "All [group] are [negative stereotype]"
- ✅ Denying rights based on identity
- ❌ Criticism of ideas/religion (not people) → May be acceptable debate
- ❌ Personal attack on individual → Use `harassment`

**Severity**: Critical (most serious violation)

**Moderator Action**: Remove immediately, permanent ban consideration, report to platform

**Moderator Note**: Zero tolerance. Document in external system. May need to report to authorities depending on jurisdiction.

---

#### 11. `violence` (暴力または脅迫 / Violence or threats)

**Purpose**: Threats of physical harm or violent content

**When to Use**:
- Direct threats ("I will kill you")
- Graphic violence descriptions
- Encouraging self-harm
- Promoting dangerous activities
- Terrorism-related content

**Examples**:
- ✅ "I'm going to find you and hurt you"
- ✅ Graphic descriptions of violence
- ✅ "You should kill yourself"
- ✅ Instructions for dangerous weapons
- ❌ Fictional violence discussion (anime plot) → Usually acceptable
- ❌ Heated argument without threats → Different reason

**Severity**: Critical (immediate safety risk)

**Moderator Action**: Remove immediately, report to authorities if credible threat, permanent ban

**Moderator Note**: Take ALL threats seriously. Document and escalate to safety team. Contact law enforcement if necessary.

---

#### 12. `nsfw` (NSFWコンテンツ / NSFW content)

**Purpose**: Not Safe For Work - sexual or graphic content

**When to Use**:
- Sexual imagery or text
- Gore or extreme violence visuals
- Drug use imagery
- Content requiring age verification

**Examples**:
- ✅ Pornographic images or links
- ✅ Graphic injury photos
- ✅ Explicit sexual descriptions
- ❌ Mild innuendo or suggestive content → May be community-dependent
- ❌ Violence threats → Use `violence`

**Severity**: Medium to High (context-dependent)

**Moderator Action**: Remove from general communities, may be allowed in age-restricted communities with tags

**Moderator Note**: Some communities allow NSFW with proper tags. Check community-specific rules.

---

#### 13. `illegal_content` (違法コンテンツ / Illegal content)

**Purpose**: Content prohibited by law

**When to Use**:
- Child sexual abuse material (CSAM)
- Human trafficking
- Drug trafficking
- Terrorism propaganda
- Counterfeit currency/documents
- Content illegal in jurisdiction

**Examples**:
- ✅ CSAM (report immediately to NCMEC)
- ✅ "Selling cocaine, DM for details"
- ✅ Terrorist recruitment materials
- ❌ Copyright violations → Use `copyright`
- ❌ Content illegal only in some countries → Exercise caution

**Severity**: Critical (legal obligation to report)

**Moderator Action**: Remove immediately, preserve evidence, report to authorities, permanent ban

**Moderator Note**: DO NOT INVESTIGATE. Remove and report to appropriate authorities immediately. This is beyond moderation scope.

---

### Category 5: User Behavior

#### 14. `bot_activity` (自動ボット活動 / Automated bot activity)

**Purpose**: Automated posting or suspicious patterns

**When to Use**:
- 100 posts in 1 minute (humanly impossible)
- Identical format repeated posts
- Instant responses (sub-second)
- Pattern matching automated behavior

**Examples**:
- ✅ Account posting every 0.5 seconds
- ✅ Same message template 50 times with slight variations
- ✅ Automated replies to all mentions
- ❌ Fast human typing → Not automation
- ❌ Scheduled posts (if allowed by community) → Not abuse

**Severity**: Medium (disrupts community flow)

**Moderator Action**: Rate limit, require verification, warn user

**Moderator Note**: Distinguish between helpful bots (if allowed) and spam bots. Check community bot policy.

---

#### 15. `impersonation` (なりすまし / Impersonation)

**Purpose**: Pretending to be someone else

**When to Use**:
- Fake celebrity accounts
- Impersonating community moderators
- Mimicking other users' handles/avatars
- Fake official accounts

**Examples**:
- ✅ "@elonmusk_real" pretending to be Elon Musk
- ✅ "Atrarium Support" (unofficial)
- ✅ Copying another user's profile to confuse others
- ❌ Parody accounts (if clearly labeled) → May be acceptable
- ❌ Role-playing (if community allows) → Not impersonation

**Severity**: High (trust and security issue)

**Moderator Action**: Remove account, verify legitimate users, permanent ban for malicious impersonation

**Moderator Note**: Coordinate with platform for verification system. AT Protocol has DID verification features.

---

#### 16. `ban_evasion` (BANの回避 / Ban evasion)

**Purpose**: Circumventing previous bans

**When to Use**:
- Banned user returns with new account
- Same DID pattern after ban
- Admitted ban evasion
- Coordinated with banned user

**Examples**:
- ✅ User says "I'm back, you can't stop me"
- ✅ New account with identical posting pattern to banned user
- ✅ User admits to being previously banned
- ❌ New user with similar interests → Coincidence, not evasion
- ❌ Reformed user after ban expiry → Check ban terms

**Severity**: High (undermines moderation)

**Moderator Action**: Immediate ban, report to platform, extend original ban period

**Moderator Note**: Document original ban reason. This should be used WITH another reason (e.g., `spam` + `ban_evasion`).

---

### Category 6: Catch-All

#### 17. `other` (その他の理由 / Other reason)

**Purpose**: Cases not covered by above 16 reasons

**When to Use**:
- Novel violation types (before adding new enum)
- Extremely community-specific situations
- Edge cases that don't fit existing categories
- Temporary reason while discussing new enum addition

**Examples**:
- ✅ New type of scam not yet categorized
- ✅ Community-specific ritual violation (in special communities)
- ✅ Legitimate reason but too specific for general enum
- ❌ Lazy moderation (should use specific reason) → Avoid overuse
- ❌ Controversial gray area you want to hide → Use specific reason

**Severity**: Varies (depends on actual violation)

**Moderator Action**: Document thoroughly in external system, consider if new enum value is needed

**Moderator Note**: If you use `other` frequently for same type of violation, propose new enum value to development team.

---

## Usage Guidelines

### For Moderators

**1. Be Specific**
- Use the most specific reason that applies
- `spam` is better than `other` for advertising
- `wrong_community` is better than `off_topic` when suggesting alternative

**2. Combine with External Notes**
When detailed context is needed:
```
✅ Public PDS: reason = "harassment"
✅ Discord: "Harassment of Alice by Bob (third offense), previous incidents:
  - 2025-09-15: Insulted Alice in #general
  - 2025-09-20: Posted Alice's old photos without consent
  - 2025-10-05: Sent threatening DM (screenshot attached)"
```

**3. Consistency**
- Use same reason for similar violations
- Enables statistical analysis
- Fair moderation (users know what to expect)

**4. Documentation**
- Always log reason in moderation action
- Add detailed notes to external system (Discord, Notion, etc.)
- Include:
  - Specific guideline/rule violated
  - Context (if not obvious)
  - Related tickets/reports
  - Previous warnings

**5. Education Over Punishment**
- First offense: Hide + educate
- Second offense: Hide + warning
- Third offense: Temporary ban
- Use `other` + context for genuine edge cases

### For Developers

**Adding New Reasons**:

```typescript
// Step 1: Add to enum array (append, don't reorder)
export const MODERATION_REASONS = [
  // ... existing 17 values
  'misinformation', // NEW
] as const;

// Step 2: Add to Lexicon schema
// specs/007-reason-enum-atproto/contracts/lexicon/net.atrarium.moderation.action.json
{
  "reason": {
    "type": "string",
    "enum": [
      // ... existing values
      "misinformation"
    ]
  }
}

// Step 3: Add i18n labels
// dashboard/src/i18n/locales/en/moderation.json
{
  "reasons": {
    "misinformation": "Misinformation or fake news"
  }
}

// dashboard/src/i18n/locales/ja/moderation.json
{
  "reasons": {
    "misinformation": "誤情報または虚偽ニュース"
  }
}

// Step 4: Update this document
// Add new reason to appropriate category with full details
```

---

## Statistical Analysis

### Tracking Community Health

**Spam Ratio**:
```
spam_ratio = (spam + low_quality + duplicate) / total_posts
Healthy: < 5%
Warning: 5-10%
Critical: > 10%
```

**Safety Score**:
```
safety_violations = harassment + hate_speech + violence + illegal_content
Safety Score = 100 - (safety_violations / total_posts * 100)
Healthy: > 99%
Warning: 95-99%
Critical: < 95%
```

**Content Fit**:
```
misfit_ratio = (off_topic + wrong_community) / total_posts
Healthy: < 10%
Warning: 10-20%
Critical: > 20% (indicates unclear community purpose)
```

### Moderation Trends

**Example Query** (hypothetical):
```sql
SELECT
  reason,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
FROM moderation_actions
WHERE community_id = 'anime-community'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY reason
ORDER BY count DESC;
```

**Expected Distribution** (healthy community):
```
spam:              40%  (most common)
low_quality:       25%
off_topic:         15%
guidelines:        10%
other:             10%
harassment:         0-1%  (rare in healthy community)
hate_speech:        0%    (should be near-zero)
```

---

## Adding New Reasons

### Decision Criteria

**Add New Reason If**:
- ✅ Used `other` 10+ times for same violation type
- ✅ Represents distinct moderation policy
- ✅ Enables better statistical analysis
- ✅ Common across multiple communities (not one-off)

**Don't Add If**:
- ❌ Very rare edge case (< 1% of all moderation)
- ❌ Community-specific quirk
- ❌ Covered by existing reason + external notes
- ❌ Would create confusion with existing reasons

### Process

1. **Proposal**: Create GitHub issue with:
   - Reason name (lowercase_snake_case)
   - EN/JA labels
   - Category
   - Use cases (5+ examples)
   - Why existing reasons insufficient

2. **Discussion**: Community moderators vote (need 60% approval)

3. **Implementation**: Follow developer steps above

4. **Migration**: Announce to moderators, update training materials

---

## Appendix: Quick Reference Table

| # | Enum Value | Category | Severity | Auto-Ban? |
|---|-----------|----------|----------|-----------|
| 1 | `spam` | Spam/Low Quality | Medium | No (warn first) |
| 2 | `low_quality` | Spam/Low Quality | Low | No |
| 3 | `duplicate` | Spam/Low Quality | Low | No |
| 4 | `off_topic` | Off-Topic | Low | No |
| 5 | `wrong_community` | Off-Topic | Very Low | No |
| 6 | `guidelines_violation` | Policy | Medium | No |
| 7 | `terms_violation` | Policy | High | Maybe (3rd offense) |
| 8 | `copyright` | Policy | High | Maybe (repeat offender) |
| 9 | `harassment` | Harmful | Critical | Yes (severe cases) |
| 10 | `hate_speech` | Harmful | Critical | Yes (immediate) |
| 11 | `violence` | Harmful | Critical | Yes (immediate) |
| 12 | `nsfw` | Harmful | Medium-High | No (context-dependent) |
| 13 | `illegal_content` | Harmful | Critical | Yes (immediate) + report |
| 14 | `bot_activity` | User Behavior | Medium | No (verify first) |
| 15 | `impersonation` | User Behavior | High | Yes (malicious) |
| 16 | `ban_evasion` | User Behavior | High | Yes (immediate) |
| 17 | `other` | Catch-All | Varies | Depends |

---

## Related Documents

- [Feature Specification](./spec.md) - Original requirements
- [Data Model](./data-model.md) - Technical schema definition
- [Quickstart Guide](./quickstart.md) - End-to-end usage scenario
- [Research](./research.md) - Why enum-only approach

---

**Last Updated**: 2025-10-05
**Version**: 1.0
**Maintainer**: Atrarium Development Team
