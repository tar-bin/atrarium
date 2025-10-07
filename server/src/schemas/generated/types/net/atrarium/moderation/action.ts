import { validate as _validate } from '../../../../lexicons';
import { is$typed as _is$typed, type $Typed } from '../../../../util';

const is$typed = _is$typed,
  validate = _validate;
const id = 'net.atrarium.moderation.action';

export interface Record {
  $type: 'net.atrarium.moderation.action';
  /** Type of moderation action */
  action: 'hide_post' | 'unhide_post' | 'block_user' | 'unblock_user';
  target: $Typed<PostTarget> | $Typed<UserTarget> | { $type: string };
  /** AT-URI of the community where this action applies */
  community: string;
  /** Reason for the moderation action (predefined enum values only). Public record stored in moderator's PDS. See MODERATION_REASONS.md for detailed descriptions. */
  reason?:
    | 'spam'
    | 'low_quality'
    | 'duplicate'
    | 'off_topic'
    | 'wrong_community'
    | 'guidelines_violation'
    | 'terms_violation'
    | 'copyright'
    | 'harassment'
    | 'hate_speech'
    | 'violence'
    | 'nsfw'
    | 'illegal_content'
    | 'bot_activity'
    | 'impersonation'
    | 'ban_evasion'
    | 'other';
  /** Action timestamp (ISO 8601) */
  createdAt: string;
  [k: string]: unknown;
}

const hashRecord = 'main';

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord);
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true);
}

/** Post being moderated (uses strongRef for immutability) */
export interface PostTarget {
  $type?: 'net.atrarium.moderation.action#postTarget';
  /** AT-URI of the post (at://did:plc:author/app.bsky.feed.post/rkey) */
  uri: string;
  /** Content identifier (CID) of the post record */
  cid: string;
}

const hashPostTarget = 'postTarget';

export function isPostTarget<V>(v: V) {
  return is$typed(v, id, hashPostTarget);
}

export function validatePostTarget<V>(v: V) {
  return validate<PostTarget & V>(v, id, hashPostTarget);
}

/** User being moderated */
export interface UserTarget {
  $type?: 'net.atrarium.moderation.action#userTarget';
  /** DID of the user being blocked/unblocked */
  did: string;
}

const hashUserTarget = 'userTarget';

export function isUserTarget<V>(v: V) {
  return is$typed(v, id, hashUserTarget);
}

export function validateUserTarget<V>(v: V) {
  return validate<UserTarget & V>(v, id, hashUserTarget);
}
