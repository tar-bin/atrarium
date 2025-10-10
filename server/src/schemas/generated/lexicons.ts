/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  type LexiconDoc,
  Lexicons,
  ValidationError,
  type ValidationResult,
} from '@atproto/lexicon';
import { is$typed, maybe$typed } from './util.js';

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
            accessType: {
              type: 'string',
              description:
                "Community access control: 'open' allows immediate join, 'invite-only' requires admin approval",
              enum: ['open', 'invite-only'],
              default: 'open',
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
  NetAtrariumCommunityEmoji: {
    lexicon: 1,
    id: 'net.atrarium.community.emoji',
    defs: {
      main: {
        type: 'record',
        description: 'A community-specific custom emoji.',
        key: 'tid',
        record: {
          type: 'object',
          required: [
            'shortcode',
            'imageBlobCid',
            'communityId',
            'createdBy',
            'createdAt',
            'approvalStatus',
          ],
          properties: {
            shortcode: {
              type: 'string',
              description: 'Emoji shortcode (alphanumeric + underscore, case-insensitive)',
              minLength: 2,
              maxLength: 32,
              // @ts-expect-error - pattern is valid Lexicon property but not in @atproto/lexicon types
              pattern: '^[a-zA-Z0-9_]+$',
            },
            imageBlobCid: {
              type: 'string',
              format: 'cid',
              description: 'AT Protocol blob CID for the emoji image',
            },
            communityId: {
              type: 'string',
              description: 'Community where the emoji is available',
              maxLength: 128,
            },
            createdBy: {
              type: 'string',
              format: 'did',
              description: 'DID of the user who uploaded the emoji',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
              description: 'Timestamp when the emoji was created',
            },
            approvalStatus: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected', 'revoked'],
              description: 'Moderation status of the emoji',
            },
            approvedBy: {
              type: 'string',
              format: 'did',
              description: 'DID of the owner/moderator who approved the emoji (optional)',
            },
            approvedAt: {
              type: 'string',
              format: 'datetime',
              description: 'Timestamp when the emoji was approved (optional)',
            },
            rejectionReason: {
              type: 'string',
              description: 'Reason for rejection (if status is rejected, optional)',
              maxLength: 500,
            },
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
            status: {
              type: 'string',
              description:
                "Membership status: 'active' for approved members, 'pending' for join requests awaiting approval",
              enum: ['active', 'pending'],
              default: 'active',
            },
            joinedAt: {
              type: 'string',
              format: 'datetime',
              description: 'Membership start timestamp (ISO 8601)',
            },
            active: {
              type: 'boolean',
              description: 'Whether membership is currently active (false = left community)',
              default: true,
            },
            invitedBy: {
              type: 'string',
              format: 'did',
              description: 'DID of user who invited this member (optional)',
            },
            customTitle: {
              type: 'string',
              description: 'Custom role title displayed in community (optional)',
              maxLength: 100,
              maxGraphemes: 50,
            },
          },
        },
      },
    },
  },
  NetAtrariumCommunityPost: {
    lexicon: 1,
    id: 'net.atrarium.community.post',
    defs: {
      main: {
        type: 'record',
        description:
          "A post in an Atrarium community timeline. Posts are stored in the user's Personal Data Server (PDS) and indexed via AT Protocol Firehose. CommunityId is immutable and survives stage transitions (theme → community → graduated).",
        key: 'tid',
        record: {
          type: 'object',
          required: ['text', 'communityId', 'createdAt'],
          properties: {
            text: {
              type: 'string',
              description:
                'Post text content (plain text fallback, required even if markdown is provided)',
              maxLength: 3000,
              maxGraphemes: 300,
              minLength: 1,
            },
            markdown: {
              type: 'string',
              description:
                'Optional Markdown-formatted content (extended syntax: tables, strikethrough, task lists). If provided, clients should render this instead of plain text. Raw HTML is blocked.',
              maxLength: 3000,
              maxGraphemes: 300,
            },
            emojiShortcodes: {
              type: 'array',
              description:
                'Optional array of emoji shortcodes used in this post (for indexing and caching). Community-approved emoji only.',
              maxLength: 20,
              items: {
                type: 'string',
                // @ts-expect-error - pattern is valid Lexicon property
                pattern: '^[a-z0-9_]+$',
                maxLength: 32,
              },
            },
            communityId: {
              type: 'string',
              description:
                'Community identifier (8-character hex, system-generated). Immutable across stage transitions.',
              // @ts-expect-error - pattern is valid Lexicon property
              pattern: '^[0-9a-f]{8}$',
              maxLength: 8,
              minLength: 8,
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
              description: 'Post creation timestamp (ISO 8601)',
            },
          },
        },
      },
    },
  },
  NetAtrariumCommunityReaction: {
    lexicon: 1,
    id: 'net.atrarium.community.reaction',
    defs: {
      main: {
        type: 'record',
        description: "A user's emoji reaction to a post within a community.",
        key: 'tid',
        record: {
          type: 'object',
          required: ['reactorDid', 'postUri', 'emoji', 'communityId', 'createdAt'],
          properties: {
            reactorDid: {
              type: 'string',
              format: 'did',
              description: 'DID of the user who reacted',
            },
            postUri: {
              type: 'string',
              format: 'at-uri',
              description: 'AT Protocol URI of the target post',
            },
            emoji: {
              type: 'ref',
              ref: 'lex:net.atrarium.community.reaction#emoji',
              description: 'Emoji identifier (Unicode or custom)',
            },
            communityId: {
              type: 'string',
              description: 'Community where the reaction was added',
              maxLength: 128,
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
              description: 'Timestamp when the reaction was created',
            },
          },
        },
      },
      emoji: {
        type: 'object',
        description: 'Emoji identifier (Unicode or custom)',
        required: ['type', 'value'],
        properties: {
          type: {
            type: 'string',
            enum: ['unicode', 'custom'],
            description: 'Type of emoji',
          },
          value: {
            type: 'string',
            description:
              'Unicode codepoint (e.g., U+1F44D) or custom emoji shortcode (e.g., partyblob)',
            maxLength: 128,
          },
        },
      },
    },
  },
  NetAtrariumEmojiApproval: {
    lexicon: 1,
    id: 'net.atrarium.emoji.approval',
    defs: {
      main: {
        type: 'record',
        description:
          "Emoji approval decision by a community owner. Stored in the community owner's Personal Data Server (PDS). Approved emoji are registered in the community's emoji namespace and cached in Durable Objects for fast lookups.",
        key: 'tid',
        record: {
          type: 'object',
          required: ['shortcode', 'emojiRef', 'communityId', 'status', 'approver', 'decidedAt'],
          properties: {
            shortcode: {
              type: 'string',
              description:
                'Registered shortcode in community namespace (unique per community). Must match the shortcode in the referenced custom emoji.',
              // @ts-expect-error - pattern is valid Lexicon property
              pattern: '^[a-z0-9_]+$',
              maxLength: 32,
              minLength: 2,
            },
            emojiRef: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT URI of the custom emoji record (e.g., at://did:plc:xxx/net.atrarium.emoji.custom/yyy)',
            },
            communityId: {
              type: 'string',
              description:
                'Community identifier (8-character hex). Defines the emoji namespace scope.',
              // @ts-expect-error - pattern is valid Lexicon property
              pattern: '^[0-9a-f]{8}$',
              maxLength: 8,
              minLength: 8,
            },
            status: {
              type: 'string',
              description:
                "Approval status: 'approved' (emoji available in community), 'rejected' (not available), 'revoked' (previously approved, now removed)",
              enum: ['approved', 'rejected', 'revoked'],
            },
            approver: {
              type: 'string',
              format: 'did',
              description: 'DID of the community owner who made the approval decision',
            },
            decidedAt: {
              type: 'string',
              format: 'datetime',
              description: 'Timestamp when the approval decision was made (ISO 8601)',
            },
            reason: {
              type: 'string',
              description: 'Optional reason for rejection or revocation',
              maxLength: 500,
              maxGraphemes: 250,
            },
          },
        },
      },
    },
  },
  NetAtrariumEmojiCustom: {
    lexicon: 1,
    id: 'net.atrarium.emoji.custom',
    defs: {
      main: {
        type: 'record',
        description:
          'Custom emoji uploaded by a user and stored in their Personal Data Server (PDS). Community owners approve custom emoji for community-wide use via net.atrarium.emoji.approval records.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['shortcode', 'blob', 'creator', 'uploadedAt', 'format', 'size', 'dimensions'],
          properties: {
            shortcode: {
              type: 'string',
              description:
                "Emoji shortcode identifier (e.g., 'my_emoji' for :my_emoji:). Used for insertion in posts.",
              // @ts-expect-error - pattern is valid Lexicon property
              pattern: '^[a-z0-9_]+$',
              maxLength: 32,
              minLength: 2,
            },
            blob: {
              type: 'blob',
              description: "Emoji image blob stored in user's PDS blob storage",
              accept: ['image/png', 'image/gif', 'image/webp'],
              maxSize: 512000,
            },
            creator: {
              type: 'string',
              format: 'did',
              description: 'DID of the user who uploaded this emoji',
            },
            uploadedAt: {
              type: 'string',
              format: 'datetime',
              description: 'Emoji upload timestamp (ISO 8601)',
            },
            format: {
              type: 'string',
              description: 'Image format',
              enum: ['png', 'gif', 'webp'],
            },
            size: {
              type: 'integer',
              description: 'File size in bytes (max 500KB = 512000 bytes)',
              minimum: 1,
              maximum: 512000,
            },
            dimensions: {
              type: 'ref',
              ref: 'lex:net.atrarium.emoji.custom#dimensions',
              description: 'Image dimensions in pixels',
            },
            animated: {
              type: 'boolean',
              description: 'True if the emoji is an animated GIF',
              default: false,
            },
          },
        },
      },
      dimensions: {
        type: 'object',
        description: 'Image dimensions (max 256x256 pixels)',
        required: ['width', 'height'],
        properties: {
          width: {
            type: 'integer',
            description: 'Image width in pixels',
            minimum: 1,
            maximum: 256,
          },
          height: {
            type: 'integer',
            description: 'Image height in pixels',
            minimum: 1,
            maximum: 256,
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
            description: 'AT-URI of the post (at://did:plc:author/app.bsky.feed.post/rkey)',
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
} as const satisfies Record<string, LexiconDoc>;
export const schemas = Object.values(schemaDict) satisfies LexiconDoc[];
export const lexicons: Lexicons = new Lexicons(schemas);

export function validate<T extends { $type: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType: true
): ValidationResult<T>;
export function validate<T extends { $type?: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: false
): ValidationResult<T>;
export function validate(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: boolean
): ValidationResult {
  return (requiredType ? is$typed : maybe$typed)(v, id, hash)
    ? lexicons.validate(`${id}#${hash}`, v)
    : {
        success: false,
        error: new ValidationError(
          `Must be an object with "${hash === 'main' ? id : `${id}#${hash}`}" $type property`
        ),
      };
}

export const ids = {
  NetAtrariumCommunityConfig: 'net.atrarium.community.config',
  NetAtrariumCommunityEmoji: 'net.atrarium.community.emoji',
  NetAtrariumCommunityMembership: 'net.atrarium.community.membership',
  NetAtrariumCommunityPost: 'net.atrarium.community.post',
  NetAtrariumCommunityReaction: 'net.atrarium.community.reaction',
  NetAtrariumEmojiApproval: 'net.atrarium.emoji.approval',
  NetAtrariumEmojiCustom: 'net.atrarium.emoji.custom',
  NetAtrariumModerationAction: 'net.atrarium.moderation.action',
} as const;
