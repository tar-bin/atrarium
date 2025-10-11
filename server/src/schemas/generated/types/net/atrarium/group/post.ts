/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { BlobRef, type ValidationResult } from '@atproto/lexicon';
import { CID } from 'multiformats/cid';
import { validate as _validate } from '../../../../lexicons';
import { is$typed as _is$typed, type $Typed, type OmitKey } from '../../../../util';

const is$typed = _is$typed,
  validate = _validate;
const id = 'net.atrarium.group.post';

export interface Record {
  $type: 'net.atrarium.group.post';
  /** Post text content (plain text fallback, required even if markdown is provided) */
  text: string;
  /** Optional Markdown-formatted content (extended syntax: tables, strikethrough, task lists). If provided, clients should render this instead of plain text. Raw HTML is blocked. */
  markdown?: string;
  /** Optional array of emoji shortcodes used in this post (for indexing and caching). Group-approved emoji only. */
  emojiShortcodes?: string[];
  /** Group identifier (8-character hex, system-generated). Immutable across stage transitions. */
  groupId: string;
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
