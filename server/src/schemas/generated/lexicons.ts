/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  type LexiconDoc,
  Lexicons,
  ValidationError,
  type ValidationResult,
} from '@atproto/lexicon'
import { type $Typed, is$typed, maybe$typed } from './util.js'

export const schemaDict = {
  NetAtrariumCommunityConfig: {
    lexicon: 1,
    id: 'net.atrarium.community.config',
    defs: {
      main: {
        type: 'record',
        description:
          "Community configuration record stored in the owner's Personal Data Server (PDS). Defines community metadata, moderation settings, and feed mixing ratios.",
        key: 'tid',
        record: {
          type: 'object',
          required: ['name', 'hashtag', 'stage', 'createdAt'],
          properties: {
            name: {
              type: 'string',
              description: 'Community display name',
              maxLength: 200,
              maxGraphemes: 100,
            },
            description: {
              type: 'string',
              description: 'Community description or purpose statement',
              maxLength: 2000,
              maxGraphemes: 1000,
            },
            hashtag: {
              type: 'string',
              description:
                'System-generated unique hashtag for feed identification (format: #atrarium_[8-hex])',
              maxLength: 20,
            },
            stage: {
              type: 'string',
              description: 'Community development stage',
              enum: ['theme', 'community', 'graduated'],
            },
            moderators: {
              type: 'array',
              description: 'List of moderator DIDs (includes owner)',
              maxLength: 50,
              items: {
                type: 'string',
                format: 'did',
              },
            },
            blocklist: {
              type: 'array',
              description: 'List of blocked user DIDs',
              maxLength: 1000,
              items: {
                type: 'string',
                format: 'did',
              },
            },
            feedMix: {
              type: 'ref',
              ref: 'lex:net.atrarium.community.config#feedMixConfig',
              description: 'Feed content mixing ratios (own/parent/global)',
            },
            parentCommunity: {
              type: 'string',
              format: 'at-uri',
              description:
                'Parent community URI (for child communities in theme → community progression)',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
              description: 'Community creation timestamp (ISO 8601)',
            },
            updatedAt: {
              type: 'string',
              format: 'datetime',
              description: 'Last update timestamp (ISO 8601)',
            },
          },
        },
      },
      feedMixConfig: {
        type: 'object',
        description: 'Feed content mixing ratios (must sum to 100)',
        required: ['own', 'parent', 'global'],
        properties: {
          own: {
            type: 'integer',
            description: 'Percentage of posts from own community (0-100)',
            minimum: 0,
            maximum: 100,
          },
          parent: {
            type: 'integer',
            description: 'Percentage of posts from parent community (0-100)',
            minimum: 0,
            maximum: 100,
          },
          global: {
            type: 'integer',
            description: 'Percentage of posts from global Bluesky feed (0-100)',
            minimum: 0,
            maximum: 100,
          },
        },
      },
    },
  },
  NetAtrariumCommunityMembership: {
    lexicon: 1,
    id: 'net.atrarium.community.membership',
    defs: {
      main: {
        type: 'record',
        description:
          "Membership record stored in the member's Personal Data Server (PDS). Represents a user's membership in a specific community with associated role and status.",
        key: 'tid',
        record: {
          type: 'object',
          required: ['community', 'role', 'joinedAt'],
          properties: {
            community: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the community config record (at://did:plc:owner/net.atrarium.community.config/rkey)',
            },
            role: {
              type: 'string',
              description: 'Membership role within the community',
              enum: ['owner', 'moderator', 'member'],
            },
            joinedAt: {
              type: 'string',
              format: 'datetime',
              description: 'Membership start timestamp (ISO 8601)',
            },
            active: {
              type: 'boolean',
              description:
                'Whether membership is currently active (false = left community)',
              default: true,
            },
            invitedBy: {
              type: 'string',
              format: 'did',
              description: 'DID of user who invited this member (optional)',
            },
            customTitle: {
              type: 'string',
              description:
                'Custom role title displayed in community (optional)',
              maxLength: 100,
              maxGraphemes: 50,
            },
          },
        },
      },
    },
  },
  NetAtrariumModerationAction: {
    lexicon: 1,
    id: 'net.atrarium.moderation.action',
    defs: {
      main: {
        type: 'record',
        description:
          "Moderation action record stored in the moderator's Personal Data Server (PDS). Records moderation decisions (hide/unhide posts, block/unblock users) for a specific community.",
        key: 'tid',
        record: {
          type: 'object',
          required: ['action', 'target', 'community', 'createdAt'],
          properties: {
            action: {
              type: 'string',
              description: 'Type of moderation action',
              enum: ['hide_post', 'unhide_post', 'block_user', 'unblock_user'],
            },
            target: {
              type: 'union',
              description: 'Target of the moderation action (post or user)',
              refs: [
                'lex:net.atrarium.moderation.action#postTarget',
                'lex:net.atrarium.moderation.action#userTarget',
              ],
            },
            community: {
              type: 'string',
              format: 'at-uri',
              description: 'AT-URI of the community where this action applies',
            },
            reason: {
              type: 'string',
              description:
                "Reason for the moderation action (predefined enum values only). Public record stored in moderator's PDS. See MODERATION_REASONS.md for detailed descriptions.",
              enum: [
                'spam',
                'low_quality',
                'duplicate',
                'off_topic',
                'wrong_community',
                'guidelines_violation',
                'terms_violation',
                'copyright',
                'harassment',
                'hate_speech',
                'violence',
                'nsfw',
                'illegal_content',
                'bot_activity',
                'impersonation',
                'ban_evasion',
                'other',
              ],
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
              description: 'Action timestamp (ISO 8601)',
            },
          },
        },
      },
      postTarget: {
        type: 'object',
        description: 'Post being moderated (uses strongRef for immutability)',
        required: ['uri', 'cid'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the post (at://did:plc:author/app.bsky.feed.post/rkey)',
          },
          cid: {
            type: 'string',
            format: 'cid',
            description: 'Content identifier (CID) of the post record',
          },
        },
      },
      userTarget: {
        type: 'object',
        description: 'User being moderated',
        required: ['did'],
        properties: {
          did: {
            type: 'string',
            format: 'did',
            description: 'DID of the user being blocked/unblocked',
          },
        },
      },
    },
  },
} as const satisfies Record<string, LexiconDoc>
export const schemas = Object.values(schemaDict) satisfies LexiconDoc[]
export const lexicons: Lexicons = new Lexicons(schemas)

export function validate<T extends { $type: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType: true,
): ValidationResult<T>
export function validate<T extends { $type?: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: false,
): ValidationResult<T>
export function validate(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: boolean,
): ValidationResult {
  return (requiredType ? is$typed : maybe$typed)(v, id, hash)
    ? lexicons.validate(`${id}#${hash}`, v)
    : {
        success: false,
        error: new ValidationError(
          `Must be an object with "${hash === 'main' ? id : `${id}#${hash}`}" $type property`,
        ),
      }
}

export const ids = {
  NetAtrariumCommunityConfig: 'net.atrarium.community.config',
  NetAtrariumCommunityMembership: 'net.atrarium.community.membership',
  NetAtrariumModerationAction: 'net.atrarium.moderation.action',
} as const
