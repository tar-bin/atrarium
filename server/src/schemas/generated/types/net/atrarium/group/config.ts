import { validate as _validate } from '../../../../lexicons';
import { is$typed as _is$typed } from '../../../../util';

const is$typed = _is$typed,
  validate = _validate;
const id = 'net.atrarium.group.config';

export interface Record {
  $type: 'net.atrarium.group.config';
  /** Group display name */
  name: string;
  /** Group description or purpose statement */
  description?: string;
  /** System-generated unique hashtag for feed identification (format: #atrarium_[8-hex]) */
  hashtag: string;
  /** Group development stage */
  stage: 'theme' | 'community' | 'graduated';
  /** Group access control: 'open' allows immediate join, 'invite-only' requires admin approval */
  accessType: 'open' | 'invite-only';
  /** List of moderator DIDs (includes owner) */
  moderators?: string[];
  /** List of blocked user DIDs */
  blocklist?: string[];
  feedMix?: FeedMixConfig;
  /** Parent group URI (for child groups in theme → community progression) */
  parentGroup?: string;
  /** Group creation timestamp (ISO 8601) */
  createdAt: string;
  /** Last update timestamp (ISO 8601) */
  updatedAt?: string;
  [k: string]: unknown;
}

const hashRecord = 'main';

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord);
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true);
}

/** Feed content mixing ratios (must sum to 100) */
export interface FeedMixConfig {
  $type?: 'net.atrarium.group.config#feedMixConfig';
  /** Percentage of posts from own group (0-100) */
  own: number;
  /** Percentage of posts from parent group (0-100) */
  parent: number;
  /** Percentage of posts from global Bluesky feed (0-100) */
  global: number;
}

const hashFeedMixConfig = 'feedMixConfig';

export function isFeedMixConfig<V>(v: V) {
  return is$typed(v, id, hashFeedMixConfig);
}

export function validateFeedMixConfig<V>(v: V) {
  return validate<FeedMixConfig & V>(v, id, hashFeedMixConfig);
}
