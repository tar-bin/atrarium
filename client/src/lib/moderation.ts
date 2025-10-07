// Moderation Reason Enum (007-reason-enum-atproto)
// Duplicates backend type (frontend has no direct access to backend src/)

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

export type ModerationReason = (typeof MODERATION_REASONS)[number];
