# Test Data Seeds

This directory contains SQL scripts to populate the Atrarium database with test data for development and testing.

## Available Seeds

### `dev-data.sql` - Development Test Data

Comprehensive test dataset including:

**Communities (5)**:
- `comm-anime-lovers` - Anime Lovers (theme, 15 members, 245 posts)
- `comm-tech-news` - Tech News (theme, 32 members, 478 posts)
- `comm-game-dev` - Game Development (theme, 28 members, 312 posts)
- `comm-anime-manga` - Manga Discussion (community, child of anime-lovers)
- `comm-web3-builders` - Web3 Builders (graduated, 156 members)

**Theme Feeds (9)**:
- 2 feeds for Anime Lovers (general, seasonal)
- 2 feeds for Tech News (AI/ML, web dev)
- 2 feeds for Game Development (Unity, pixel art)
- 1 feed for Manga Discussion (weekly releases)
- 2 feeds for Web3 Builders (DeFi, NFT)

**Users**:
- 3 community owners (`did:plc:owner123`, `did:plc:owner456`, `did:plc:owner789`)
- 10 members (`did:plc:user001` through `did:plc:user010`)
- 2 problematic users (`did:plc:spammer`, `did:plc:troll`)

**Posts (20)**:
- 18 approved posts across all feeds
- 2 hidden posts (spam and trolling)
- Mix of text-only and media posts

**Moderation Actions (3)**:
- 2 hidden posts
- 1 blocked user

## Usage

### Local Development (with --local flag)

```bash
# Load schema first (if needed)
npx wrangler d1 execute atrarium-db --local --file=schema.sql

# Load test data
npx wrangler d1 execute atrarium-db --local --file=seeds/dev-data.sql
```

### Remote Database (Production/Staging)

```bash
# ⚠️ WARNING: This will DELETE existing data!
npx wrangler d1 execute atrarium-db --file=seeds/dev-data.sql
```

### View Loaded Data

```bash
# Check communities
npx wrangler d1 execute atrarium-db --local --command "SELECT id, name, stage, member_count FROM communities"

# Check feeds
npx wrangler d1 execute atrarium-db --local --command "SELECT id, name, hashtag, posts_7d FROM theme_feeds"

# Check posts
npx wrangler d1 execute atrarium-db --local --command "SELECT feed_id, author_did, text_content, moderation_status FROM post_index LIMIT 10"

# Check summary
npx wrangler d1 execute atrarium-db --local --command "
SELECT 'Communities' as table_name, COUNT(*) as count FROM communities
UNION ALL SELECT 'Feeds', COUNT(*) FROM theme_feeds
UNION ALL SELECT 'Posts', COUNT(*) FROM post_index
UNION ALL SELECT 'Members', COUNT(*) FROM memberships
"
```

## Test Users

You can use these DIDs when testing the dashboard:

| DID | Role | Communities |
|-----|------|-------------|
| `did:plc:owner123` | Owner | Anime Lovers, Manga Discussion |
| `did:plc:owner456` | Owner | Tech News |
| `did:plc:owner789` | Owner | Game Development |
| `did:plc:owner999` | Owner | Web3 Builders |
| `did:plc:user001` | Moderator | Anime Lovers |
| `did:plc:user002` | Member | Anime Lovers, Manga Discussion |
| `did:plc:user004` | Moderator | Tech News |
| `did:plc:user007` | Moderator | Game Development |

## Creating Custom Seeds

1. Create a new `.sql` file in this directory
2. Use the same schema structure as `dev-data.sql`
3. Follow the constraints in `schema.sql`:
   - `stage IN ('theme', 'community', 'graduated')`
   - `feed_mix_own + feed_mix_parent + feed_mix_global = 1.0`
   - `role IN ('owner', 'moderator', 'member')`
   - `moderation_status IN ('approved', 'hidden', 'reported')`
   - Timestamps are Unix epoch (seconds)

4. Test your seed:
   ```bash
   npx wrangler d1 execute atrarium-db --local --file=seeds/your-seed.sql
   ```

## Notes

- The `dev-data.sql` script includes `DELETE FROM` statements at the top to clear existing data
- Comment out the `DELETE` statements if you want to append data instead of replacing
- All timestamps are Unix epoch in seconds
- Feed hashtags follow the format `#atr_xxxxxxxx` (8 hex chars)
- Post URIs follow the AT Protocol format: `at://did:plc:xxx/app.bsky.feed.post/yyy`
