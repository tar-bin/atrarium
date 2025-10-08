import { validate as _validate } from '../../../../lexicons';
import { is$typed as _is$typed } from '../../../../util';

const is$typed = _is$typed,
  validate = _validate;
const id = 'net.atrarium.community.post';

export interface Record {
  $type: 'net.atrarium.community.post';
  /** Post text content (plain text only in initial version) */
  text: string;
  /** Community identifier (8-character hex, system-generated). Immutable across stage transitions. */
  communityId: string;
  /** Post creation timestamp (ISO 8601) */
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
