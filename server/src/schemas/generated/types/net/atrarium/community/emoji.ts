import { validate as _validate } from '../../../../lexicons';
import { is$typed as _is$typed } from '../../../../util';

const is$typed = _is$typed,
  validate = _validate;
const id = 'net.atrarium.community.emoji';

export interface Record {
  $type: 'net.atrarium.community.emoji';
  /** Emoji shortcode (alphanumeric + underscore, case-insensitive) */
  shortcode: string;
  /** AT Protocol blob CID for the emoji image */
  imageBlobCid: string;
  /** Community where the emoji is available */
  communityId: string;
  /** DID of the user who uploaded the emoji */
  createdBy: string;
  /** Timestamp when the emoji was created */
  createdAt: string;
  /** Moderation status of the emoji */
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'revoked';
  /** DID of the owner/moderator who approved the emoji (optional) */
  approvedBy?: string;
  /** Timestamp when the emoji was approved (optional) */
  approvedAt?: string;
  /** Reason for rejection (if status is rejected, optional) */
  rejectionReason?: string;
  [k: string]: unknown;
}

const hashRecord = 'main';

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord);
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true);
}
