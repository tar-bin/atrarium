# Moderation Reasons Reference

**Status**: Stable (as of 2025-10-06)

This document defines the 17 predefined moderation reason enum values for `net.atrarium.moderation.action`.

---

## Overview

Atrarium uses **predefined enum values** instead of free-text reasons to prevent accidental leakage of personal information. All moderation actions are PUBLIC records stored in moderators' Personal Data Servers (PDS).

**Key Principle**: Enum-only approach eliminates privacy risks. Moderators select from dropdown (no free-text input possible).

**For detailed context**: Use external systems (Discord, internal tools) for confidential notes.

---

## Reason Catalog

### Spam / Low Quality

#### 1. `spam` - Spam post (スパム投稿)

Unsolicited advertising, promotional content, or irrelevant links.

**Examples**: Commercial ads, affiliate links, cross-posting same content to multiple communities, bot-generated promotions.

**Severity**: Medium | **Action**: Hide post, warn user on first offense

---

#### 2. `low_quality` - Low-quality content (低品質コンテンツ)

Content that adds no value to the community discussion.

**Examples**: Single-word posts ("lol", "w"), random characters, unintelligible text, unrelated memes without context.

**Severity**: Low | **Action**: Hide post, educate user on community standards

---

#### 3. `duplicate` - Duplicate post (重複投稿)

Same content posted multiple times (accidental or intentional).

**Examples**: Accidental double submission, topic already discussed in recent thread.

**Severity**: Low | **Action**: Hide duplicate, link to original thread

---

### Off-Topic

#### 4. `off_topic` - Off-topic content (トピック外のコンテンツ)

Content unrelated to the community's theme.

**Examples**: Politics in anime community, recipes in technology community.

**Severity**: Low | **Action**: Hide post, redirect to appropriate community

---

#### 5. `wrong_community` - Posted in wrong community (誤ったコミュニティへの投稿)

Good content, but should be in a different (specific) community.

**Examples**: Posting in "Anime General" when "Attack on Titan" community exists, beginner question in advanced developer community.

**Severity**: Very Low | **Action**: Hide post, suggest specific alternative community

---

### Policy Violations

#### 6. `guidelines_violation` - Community guidelines violation (コミュニティガイドライン違反)

Violates specific community rules (not platform-wide rules).

**Examples**: "No image posts" rule violated, "English only" community receives Japanese post.

**Severity**: Medium | **Action**: Hide post, cite specific guideline violated

---

#### 7. `terms_violation` - Terms of service violation (利用規約違反)

Violates Atrarium platform-wide Terms of Service.

**Examples**: Multiple accounts to evade restrictions, coordinated inauthentic behavior, API abuse.

**Severity**: High | **Action**: Hide post, report to platform administrators

---

#### 8. `copyright` - Copyright infringement (著作権侵害)

Unauthorized use of copyrighted material.

**Examples**: Full episodes without permission, manga scans, pirated software, linking to piracy sites.

**Severity**: High | **Action**: Remove immediately, document for DMCA compliance

---

### Harmful Content

#### 9. `harassment` - Harassment or bullying (ハラスメントまたはいじめ)

Targeted attacks on specific individuals.

**Examples**: Personal attacks, doxxing (sharing personal information), coordinated pile-on harassment.

**Severity**: Critical | **Action**: Remove immediately, warn or suspend user

---

#### 10. `hate_speech` - Hate speech (ヘイトスピーチ)

Discrimination based on protected characteristics.

**Examples**: Racial slurs, gender-based discrimination, religious intolerance, LGBTQ+ hate speech, disability discrimination.

**Severity**: Critical | **Action**: Remove immediately, permanent ban consideration

---

#### 11. `violence` - Violence or threats (暴力または脅迫)

Threats of physical harm or violent content.

**Examples**: Direct threats ("I will hurt you"), graphic violence descriptions, encouraging self-harm, terrorism-related content.

**Severity**: Critical | **Action**: Remove immediately, report to authorities if credible threat

---

#### 12. `nsfw` - NSFW content (NSFWコンテンツ)

Not Safe For Work - sexual or graphic content.

**Examples**: Sexual imagery or text, gore, extreme violence visuals, drug use imagery.

**Severity**: Medium to High | **Action**: Remove from general communities, may be allowed in age-restricted communities with tags

---

#### 13. `illegal_content` - Illegal content (違法コンテンツ)

Content prohibited by law.

**Examples**: CSAM (report immediately to NCMEC), human trafficking, drug trafficking, terrorism propaganda, counterfeit currency/documents.

**Severity**: Critical | **Action**: Remove immediately, preserve evidence, report to authorities, permanent ban

**Note**: DO NOT INVESTIGATE. Remove and report immediately.

---

### User Behavior

#### 14. `bot_activity` - Automated bot activity (自動ボット活動)

Automated posting or suspicious patterns.

**Examples**: 100 posts in 1 minute, identical format repeated posts, instant responses (sub-second).

**Severity**: Medium | **Action**: Rate limit, require verification, warn user

---

#### 15. `impersonation` - Impersonation (なりすまし)

Pretending to be someone else.

**Examples**: Fake celebrity accounts, impersonating community moderators, mimicking other users' handles/avatars.

**Severity**: High | **Action**: Remove account, verify legitimate users, permanent ban for malicious impersonation

---

#### 16. `ban_evasion` - Ban evasion (BANの回避)

Circumventing previous bans.

**Examples**: Banned user returns with new account, admitted ban evasion.

**Severity**: High | **Action**: Immediate ban, report to platform, extend original ban period

**Note**: Should be used WITH another reason (e.g., `spam` + `ban_evasion`).

---

#### 17. `other` - Other reason (その他の理由)

Cases not covered by above 16 reasons.

**Examples**: Novel violation types (before adding new enum), extremely community-specific situations.

**Severity**: Varies | **Action**: Document thoroughly in external system, consider if new enum value is needed

**Note**: If used frequently for same violation type, propose new enum value.

---

## Usage Guidelines

### For Moderators

1. **Be Specific**: Use the most specific reason that applies.
2. **External Notes**: Store detailed context in private systems (Discord, internal tools), not in public PDS records.
3. **Consistency**: Use same reason for similar violations to enable fair moderation.
4. **Education First**: First offense = hide + educate, repeated offenses = warnings/bans.

### For Developers

When adding new reasons:

1. Add to `MODERATION_REASONS` array in implementation
2. Update `net.atrarium.moderation.action.json` enum
3. Add i18n labels (EN/JA) in client
4. Update this document with full details

**Criteria for new reasons**:
- ✅ Used `other` 10+ times for same violation type
- ✅ Represents distinct moderation policy
- ✅ Common across multiple communities (not one-off)

---

## Quick Reference

| Enum Value | Category | Severity | Auto-Ban? |
|-----------|----------|----------|-----------|
| `spam` | Spam/Low Quality | Medium | No (warn first) |
| `low_quality` | Spam/Low Quality | Low | No |
| `duplicate` | Spam/Low Quality | Low | No |
| `off_topic` | Off-Topic | Low | No |
| `wrong_community` | Off-Topic | Very Low | No |
| `guidelines_violation` | Policy | Medium | No |
| `terms_violation` | Policy | High | Maybe (3rd offense) |
| `copyright` | Policy | High | Maybe (repeat offender) |
| `harassment` | Harmful | Critical | Yes (severe cases) |
| `hate_speech` | Harmful | Critical | Yes (immediate) |
| `violence` | Harmful | Critical | Yes (immediate) |
| `nsfw` | Harmful | Medium-High | No (context-dependent) |
| `illegal_content` | Harmful | Critical | Yes (immediate) + report |
| `bot_activity` | User Behavior | Medium | No (verify first) |
| `impersonation` | User Behavior | High | Yes (malicious) |
| `ban_evasion` | User Behavior | High | Yes (immediate) |
| `other` | Catch-All | Varies | Depends |

---

**Last Updated**: 2025-10-06
**Version**: 1.0
**Lexicon**: `net.atrarium.moderation.action`
