/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../../lexicons'
import {
  type $Typed,
  is$typed as _is$typed,
  type OmitKey,
} from '../../../../util'

const is$typed = _is$typed,
  validate = _validate
const id = 'net.atrarium.moderation.action'

export interface Record {
  $type: 'net.atrarium.moderation.action'
  /** Type of moderation action */
  action: 'hide_post' | 'unhide_post' | 'block_user' | 'unblock_user'
  target: $Typed<PostTarget> | $Typed<UserTarget> | { $type: string }
  /** AT-URI of the community where this action applies */
  community: string
  /** Reason for the moderation action (optional). WARNING: This is a PUBLIC record. Do NOT include personal information (emails, phone numbers), confidential data, or defamatory language. Use brief, professional descriptions (e.g., 'Spam post', 'Community guidelines violation'). */
  reason?: string
  /** Action timestamp (ISO 8601) */
  createdAt: string
  [k: string]: unknown
}

const hashRecord = 'main'

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord)
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true)
}

/** Post being moderated (uses strongRef for immutability) */
export interface PostTarget {
  $type?: 'net.atrarium.moderation.action#postTarget'
  /** AT-URI of the post (at://did:plc:author/app.bsky.feed.post/rkey) */
  uri: string
  /** Content identifier (CID) of the post record */
  cid: string
}

const hashPostTarget = 'postTarget'

export function isPostTarget<V>(v: V) {
  return is$typed(v, id, hashPostTarget)
}

export function validatePostTarget<V>(v: V) {
  return validate<PostTarget & V>(v, id, hashPostTarget)
}

/** User being moderated */
export interface UserTarget {
  $type?: 'net.atrarium.moderation.action#userTarget'
  /** DID of the user being blocked/unblocked */
  did: string
}

const hashUserTarget = 'userTarget'

export function isUserTarget<V>(v: V) {
  return is$typed(v, id, hashUserTarget)
}

export function validateUserTarget<V>(v: V) {
  return validate<UserTarget & V>(v, id, hashUserTarget)
}
