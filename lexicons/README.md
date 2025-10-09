# Atrarium AT Protocol Lexicon Schemas

**Status**: Beta (as of 2025-10-06)

These schemas are in beta and may undergo breaking changes before third-party adoption milestone. Once a third party implements support for these schemas, they will be considered stable and follow AT Protocol versioning rules (additive-only changes).

## Schemas

- `net.atrarium.community.config` - Community metadata (name, hashtag, stage, moderators, feedMix)
- `net.atrarium.community.membership` - User membership records (DID, role, joinedAt, active status)
- `net.atrarium.community.reaction` - Emoji reaction records (postUri, emoji, communityId, reactor DID, timestamp)
- `net.atrarium.community.emoji` - Custom emoji metadata (shortcode, image blob CID, community ID, approval status)
- `net.atrarium.community.post` - Custom community posts (text, communityId, createdAt)
- `net.atrarium.emoji.custom` - DEPRECATED (use `net.atrarium.community.emoji` instead)
- `net.atrarium.emoji.approval` - DEPRECATED (approval status now integrated in `net.atrarium.community.emoji`)
- `net.atrarium.moderation.action` - Moderation action records (hide post, block user, etc.)

## Versioning Policy

- **Beta period**: Breaking changes allowed with migration guidance
- **Post-stabilization**: Additive-only changes (new optional fields)
- **Breaking changes**: Require new namespace (e.g., `net.atrarium.v2.*`)

## Usage

These Lexicon schemas define the AT Protocol records used by Atrarium for community management. They can be fetched via the Lexicon publication endpoint:

```
GET /xrpc/net.atrarium.lexicon.get?nsid=net.atrarium.community.config
GET /xrpc/net.atrarium.lexicon.get?nsid=net.atrarium.community.membership
GET /xrpc/net.atrarium.lexicon.get?nsid=net.atrarium.community.reaction
GET /xrpc/net.atrarium.lexicon.get?nsid=net.atrarium.community.emoji
GET /xrpc/net.atrarium.lexicon.get?nsid=net.atrarium.community.post
GET /xrpc/net.atrarium.lexicon.get?nsid=net.atrarium.moderation.action
```

## Development

When modifying schemas:

1. Edit the JSON files in this directory (`lexicons/`)
2. Run `npm run codegen` to regenerate TypeScript types
3. Commit both the JSON schemas and generated TypeScript files

See [AT Protocol Lexicon Documentation](https://atproto.com/specs/lexicon) for schema format details.
