import { validate as _validate } from '../../../../lexicons';
import { is$typed as _is$typed } from '../../../../util';

const is$typed = _is$typed,
  validate = _validate;
const id = 'net.atrarium.emoji.approval';

export interface Record {
  $type: 'net.atrarium.emoji.approval';
  /** Registered shortcode in community namespace (unique per community). Must match the shortcode in the referenced custom emoji. */
  shortcode: string;
  /** AT URI of the custom emoji record (e.g., at://did:plc:xxx/net.atrarium.emoji.custom/yyy) */
  emojiRef: string;
  /** Community identifier (8-character hex). Defines the emoji namespace scope. */
  communityId: string;
  /** Approval status: 'approved' (emoji available in community), 'rejected' (not available), 'revoked' (previously approved, now removed) */
  status: 'approved' | 'rejected' | 'revoked';
  /** DID of the community owner who made the approval decision */
  approver: string;
  /** Timestamp when the approval decision was made (ISO 8601) */
  decidedAt: string;
  /** Optional reason for rejection or revocation */
  reason?: string;
  [k: string]: unknown;
}

const hashRecord = 'main';

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord);
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true);
}
