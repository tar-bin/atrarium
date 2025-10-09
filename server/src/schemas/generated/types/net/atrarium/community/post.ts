import { validate as _validate } from '../../../../lexicons';
import { is$typed as _is$typed } from '../../../../util';

const is$typed = _is$typed,
  validate = _validate;
const id = 'net.atrarium.community.post';

export interface Record {
  $type: 'net.atrarium.community.post';
  /** Post text content (plain text fallback, required even if markdown is provided) */
  text: string;
  /** Optional Markdown-formatted content (extended syntax: tables, strikethrough, task lists). If provided, clients should render this instead of plain text. Raw HTML is blocked. */
  markdown?: string;
  /** Optional array of emoji shortcodes used in this post (for indexing and caching). Community-approved emoji only. */
  emojiShortcodes?: string[];
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
