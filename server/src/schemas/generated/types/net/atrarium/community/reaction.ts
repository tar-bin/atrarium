import { validate as _validate } from '../../../../lexicons';
import { is$typed as _is$typed } from '../../../../util';

const is$typed = _is$typed,
  validate = _validate;
const id = 'net.atrarium.community.reaction';

export interface Record {
  $type: 'net.atrarium.community.reaction';
  /** DID of the user who reacted */
  reactorDid: string;
  /** AT Protocol URI of the target post */
  postUri: string;
  emoji: Emoji;
  /** Community where the reaction was added */
  communityId: string;
  /** Timestamp when the reaction was created */
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

/** Emoji identifier (Unicode or custom) */
export interface Emoji {
  $type?: 'net.atrarium.community.reaction#emoji';
  /** Type of emoji */
  type: 'unicode' | 'custom';
  /** Unicode codepoint (e.g., U+1F44D) or custom emoji shortcode (e.g., partyblob) */
  value: string;
}

const hashEmoji = 'emoji';

export function isEmoji<V>(v: V) {
  return is$typed(v, id, hashEmoji);
}

export function validateEmoji<V>(v: V) {
  return validate<Emoji & V>(v, id, hashEmoji);
}
