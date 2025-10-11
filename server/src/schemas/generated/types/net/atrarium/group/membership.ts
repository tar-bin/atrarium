/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { BlobRef, type ValidationResult } from '@atproto/lexicon';
import { CID } from 'multiformats/cid';
import { validate as _validate } from '../../../../lexicons';
import { is$typed as _is$typed, type $Typed, type OmitKey } from '../../../../util';

const is$typed = _is$typed,
  validate = _validate;
const id = 'net.atrarium.group.membership';

export interface Record {
  $type: 'net.atrarium.group.membership';
  /** AT-URI of the group config record (at://did:plc:owner/net.atrarium.group.config/rkey) */
  group: string;
  /** Membership role within the group */
  role: 'owner' | 'moderator' | 'member';
  /** Membership status: 'active' for approved members, 'pending' for join requests awaiting approval */
  status: 'active' | 'pending';
  /** Membership start timestamp (ISO 8601) */
  joinedAt: string;
  /** Whether membership is currently active (false = left group) */
  active: boolean;
  /** DID of user who invited this member (optional) */
  invitedBy?: string;
  /** Custom role title displayed in group (optional) */
  customTitle?: string;
  [k: string]: unknown;
}

const hashRecord = 'main';

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord);
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true);
}
