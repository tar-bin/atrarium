/**
 * GENERATED CODE - DO NOT MODIFY
 */
import type { BlobRef } from '@atproto/lexicon';
import { validate as _validate } from '../../../../lexicons';
import { is$typed as _is$typed } from '../../../../util';

const is$typed = _is$typed,
  validate = _validate;
const id = 'net.atrarium.emoji.custom';

export interface Record {
  $type: 'net.atrarium.emoji.custom';
  /** Emoji shortcode identifier (e.g., 'my_emoji' for :my_emoji:). Used for insertion in posts. */
  shortcode: string;
  /** Emoji image blob stored in user's PDS blob storage */
  blob: BlobRef;
  /** DID of the user who uploaded this emoji */
  creator: string;
  /** Emoji upload timestamp (ISO 8601) */
  uploadedAt: string;
  /** Image format */
  format: 'png' | 'gif' | 'webp';
  /** File size in bytes (max 500KB = 512000 bytes) */
  size: number;
  dimensions: Dimensions;
  /** True if the emoji is an animated GIF */
  animated: boolean;
  [k: string]: unknown;
}

const hashRecord = 'main';

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord);
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true);
}

/** Image dimensions (max 256x256 pixels) */
export interface Dimensions {
  $type?: 'net.atrarium.emoji.custom#dimensions';
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
}

const hashDimensions = 'dimensions';

export function isDimensions<V>(v: V) {
  return is$typed(v, id, hashDimensions);
}

export function validateDimensions<V>(v: V) {
  return validate<Dimensions & V>(v, id, hashDimensions);
}
