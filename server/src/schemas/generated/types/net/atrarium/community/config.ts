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
const id = 'net.atrarium.community.config'

export interface Record {
  $type: 'net.atrarium.community.config'
  /** Community display name */
  name: string
  /** Community description or purpose statement */
  description?: string
  /** System-generated unique hashtag for feed identification (format: #atrarium_[8-hex]) */
  hashtag: string
  /** Community development stage */
  stage: 'theme' | 'community' | 'graduated'
  /** List of moderator DIDs (includes owner) */
  moderators?: string[]
  /** List of blocked user DIDs */
  blocklist?: string[]
  feedMix?: FeedMixConfig
  /** Parent community URI (for child communities in theme → community progression) */
  parentCommunity?: string
  /** Community creation timestamp (ISO 8601) */
  createdAt: string
  /** Last update timestamp (ISO 8601) */
  updatedAt?: string
  [k: string]: unknown
}

const hashRecord = 'main'

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord)
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true)
}

/** Feed content mixing ratios (must sum to 100) */
export interface FeedMixConfig {
  $type?: 'net.atrarium.community.config#feedMixConfig'
  /** Percentage of posts from own community (0-100) */
  own: number
  /** Percentage of posts from parent community (0-100) */
  parent: number
  /** Percentage of posts from global Bluesky feed (0-100) */
  global: number
}

const hashFeedMixConfig = 'feedMixConfig'

export function isFeedMixConfig<V>(v: V) {
  return is$typed(v, id, hashFeedMixConfig)
}

export function validateFeedMixConfig<V>(v: V) {
  return validate<FeedMixConfig & V>(v, id, hashFeedMixConfig)
}
