-- Development Test Data for Atrarium
-- Run with: npx wrangler d1 execute atrarium-db --local --file=seeds/dev-data.sql

-- Clear existing data (optional - comment out if you want to keep existing data)
DELETE FROM moderation_logs;
DELETE FROM feed_blocklist;
DELETE FROM post_index;
DELETE FROM memberships;
DELETE FROM theme_feeds;
DELETE FROM communities;

-- Insert test communities
INSERT INTO communities (id, name, description, stage, parent_id, feed_mix_own, feed_mix_parent, feed_mix_global, member_count, post_count, created_at) VALUES
-- Top-level theme communities
('comm-anime-lovers', 'Anime Lovers', 'A community for anime enthusiasts to discuss their favorite shows', 'theme', NULL, 1.0, 0.0, 0.0, 15, 245, 1704067200),
('comm-tech-news', 'Tech News', 'Latest technology news and discussions', 'theme', NULL, 1.0, 0.0, 0.0, 32, 478, 1704153600),
('comm-game-dev', 'Game Development', 'Indie game developers sharing knowledge and progress', 'theme', NULL, 1.0, 0.0, 0.0, 28, 312, 1704240000),

-- Sub-community (child of anime-lovers)
('comm-anime-manga', 'Manga Discussion', 'Focused discussion on manga and light novels', 'community', 'comm-anime-lovers', 0.5, 0.3, 0.2, 8, 89, 1704326400),

-- Graduated community
('comm-web3-builders', 'Web3 Builders', 'Decentralized web developers and blockchain enthusiasts', 'graduated', NULL, 0.5, 0.0, 0.5, 156, 2890, 1701388800);

-- Insert theme feeds
INSERT INTO theme_feeds (id, community_id, name, description, hashtag, status, posts_7d, active_users_7d, created_at) VALUES
-- Feeds for Anime Lovers
('feed-anime-general', 'comm-anime-lovers', 'General Anime Talk', 'General anime discussions and recommendations', '#atr_a1b2c3d4', 'active', 42, 12, 1704067200),
('feed-anime-seasonal', 'comm-anime-lovers', 'Seasonal Anime', 'Current season anime episode discussions', '#atr_e5f6g7h8', 'active', 68, 15, 1704153600),

-- Feeds for Tech News
('feed-tech-ai', 'comm-tech-news', 'AI & Machine Learning', 'Artificial intelligence and ML developments', '#atr_i9j0k1l2', 'active', 95, 28, 1704067200),
('feed-tech-web', 'comm-tech-news', 'Web Development', 'Frontend, backend, and full-stack web dev', '#atr_m3n4o5p6', 'active', 78, 24, 1704153600),

-- Feeds for Game Development
('feed-game-unity', 'comm-game-dev', 'Unity Tips', 'Unity engine tips and tricks', '#atr_q7r8s9t0', 'active', 45, 18, 1704067200),
('feed-game-pixel', 'comm-game-dev', 'Pixel Art', 'Pixel art and sprite creation', '#atr_u1v2w3x4', 'active', 38, 14, 1704153600),

-- Feed for Manga Discussion
('feed-manga-weekly', 'comm-anime-manga', 'Weekly Manga Releases', 'Discussion of new manga chapters', '#atr_y5z6a7b8', 'active', 28, 8, 1704326400),

-- Feeds for Web3 Builders
('feed-web3-defi', 'comm-web3-builders', 'DeFi Projects', 'Decentralized finance discussions', '#atr_c9d0e1f2', 'active', 156, 45, 1701388800),
('feed-web3-nft', 'comm-web3-builders', 'NFT Development', 'NFT smart contracts and marketplaces', '#atr_g3h4i5j6', 'warning', 89, 32, 1701388800);

-- Insert memberships (users in communities)
INSERT INTO memberships (community_id, user_did, role, joined_at) VALUES
-- Anime Lovers members
('comm-anime-lovers', 'did:plc:owner123', 'owner', 1704067200),
('comm-anime-lovers', 'did:plc:user001', 'moderator', 1704153600),
('comm-anime-lovers', 'did:plc:user002', 'member', 1704240000),
('comm-anime-lovers', 'did:plc:user003', 'member', 1704326400),

-- Tech News members
('comm-tech-news', 'did:plc:owner456', 'owner', 1704153600),
('comm-tech-news', 'did:plc:user004', 'moderator', 1704240000),
('comm-tech-news', 'did:plc:user005', 'member', 1704326400),
('comm-tech-news', 'did:plc:user006', 'member', 1704412800),

-- Game Dev members
('comm-game-dev', 'did:plc:owner789', 'owner', 1704240000),
('comm-game-dev', 'did:plc:user007', 'moderator', 1704326400),
('comm-game-dev', 'did:plc:user008', 'member', 1704412800),

-- Manga Discussion members
('comm-anime-manga', 'did:plc:owner123', 'owner', 1704326400),
('comm-anime-manga', 'did:plc:user002', 'member', 1704412800),
('comm-anime-manga', 'did:plc:user003', 'member', 1704499200),

-- Web3 Builders members
('comm-web3-builders', 'did:plc:owner999', 'owner', 1701388800),
('comm-web3-builders', 'did:plc:user009', 'moderator', 1701475200),
('comm-web3-builders', 'did:plc:user010', 'member', 1701561600);

-- Insert sample posts
INSERT INTO post_index (uri, feed_id, author_did, text_content, has_media, langs, moderation_status, created_at, indexed_at) VALUES
-- Anime Lovers posts
('at://did:plc:user002/app.bsky.feed.post/anime001', 'feed-anime-general', 'did:plc:user002', 'Just finished watching Frieren! The animation quality is incredible. #atr_a1b2c3d4', false, 'en', 'approved', 1704412800, 1704412800),
('at://did:plc:user003/app.bsky.feed.post/anime002', 'feed-anime-general', 'did:plc:user003', 'Looking for recommendations similar to Steins;Gate. Any suggestions? #atr_a1b2c3d4', false, 'en', 'approved', 1704499200, 1704499200),
('at://did:plc:user001/app.bsky.feed.post/anime003', 'feed-anime-seasonal', 'did:plc:user001', 'Episode 5 of the new season was amazing! That plot twist 😱 #atr_e5f6g7h8', false, 'en', 'approved', 1704585600, 1704585600),
('at://did:plc:user002/app.bsky.feed.post/anime004', 'feed-anime-seasonal', 'did:plc:user002', 'The OST in todays episode gave me chills. Studio really outdid themselves. #atr_e5f6g7h8', true, 'en', 'approved', 1704672000, 1704672000),

-- Tech News posts
('at://did:plc:user004/app.bsky.feed.post/tech001', 'feed-tech-ai', 'did:plc:user004', 'New GPT-5 benchmarks are out. Performance improvements are significant! #atr_i9j0k1l2', true, 'en', 'approved', 1704412800, 1704412800),
('at://did:plc:user005/app.bsky.feed.post/tech002', 'feed-tech-ai', 'did:plc:user005', 'Working on a new ML model for image classification. Any tips for optimizing inference speed? #atr_i9j0k1l2', false, 'en', 'approved', 1704499200, 1704499200),
('at://did:plc:user006/app.bsky.feed.post/tech003', 'feed-tech-web', 'did:plc:user006', 'React 19 is looking really promising. Excited about the new compiler! #atr_m3n4o5p6', false, 'en', 'approved', 1704585600, 1704585600),
('at://did:plc:user004/app.bsky.feed.post/tech004', 'feed-tech-web', 'did:plc:user004', 'Just deployed my first Cloudflare Workers app. The DX is incredible! #atr_m3n4o5p6', false, 'en', 'approved', 1704672000, 1704672000),

-- Game Dev posts
('at://did:plc:user007/app.bsky.feed.post/game001', 'feed-game-unity', 'did:plc:user007', 'Pro tip: Use object pooling for projectiles to avoid GC spikes in Unity #atr_q7r8s9t0', false, 'en', 'approved', 1704412800, 1704412800),
('at://did:plc:user008/app.bsky.feed.post/game002', 'feed-game-unity', 'did:plc:user008', 'Finally got my character controller working smoothly. Physics can be tricky! #atr_q7r8s9t0', true, 'en', 'approved', 1704499200, 1704499200),
('at://did:plc:user007/app.bsky.feed.post/game003', 'feed-game-pixel', 'did:plc:user007', 'Working on a new pixel art tileset for my game. Heres a preview! #atr_u1v2w3x4', true, 'en', 'approved', 1704585600, 1704585600),
('at://did:plc:user008/app.bsky.feed.post/game004', 'feed-game-pixel', 'did:plc:user008', 'What are your favorite pixel art tools? Im using Aseprite currently. #atr_u1v2w3x4', false, 'en', 'approved', 1704672000, 1704672000),

-- Manga Discussion posts
('at://did:plc:user002/app.bsky.feed.post/manga001', 'feed-manga-weekly', 'did:plc:user002', 'New One Piece chapter was insane! Cant believe what just happened 🤯 #atr_y5z6a7b8', false, 'en', 'approved', 1704412800, 1704412800),
('at://did:plc:user003/app.bsky.feed.post/manga002', 'feed-manga-weekly', 'did:plc:user003', 'Just caught up with Jujutsu Kaisen manga. The art style is phenomenal! #atr_y5z6a7b8', true, 'en', 'approved', 1704499200, 1704499200),

-- Web3 Builders posts
('at://did:plc:user009/app.bsky.feed.post/web3001', 'feed-web3-defi', 'did:plc:user009', 'Launched my first DeFi protocol on testnet! Working on security audits now. #atr_c9d0e1f2', false, 'en', 'approved', 1704326400, 1704326400),
('at://did:plc:user010/app.bsky.feed.post/web3002', 'feed-web3-defi', 'did:plc:user010', 'Gas optimization techniques saved us 40% on transaction costs! #atr_c9d0e1f2', true, 'en', 'approved', 1704412800, 1704412800),
('at://did:plc:user009/app.bsky.feed.post/web3003', 'feed-web3-nft', 'did:plc:user009', 'New NFT collection dropping next week. Built with ERC-721A for efficiency. #atr_g3h4i5j6', true, 'en', 'approved', 1704499200, 1704499200),

-- Some hidden posts (for moderation testing)
('at://did:plc:spammer/app.bsky.feed.post/spam001', 'feed-anime-general', 'did:plc:spammer', 'Buy cheap anime merch here! Click my link... #atr_a1b2c3d4', false, 'en', 'hidden', 1704585600, 1704585600),
('at://did:plc:troll/app.bsky.feed.post/troll001', 'feed-tech-ai', 'did:plc:troll', 'AI is garbage and will never work! #atr_i9j0k1l2', false, 'en', 'hidden', 1704672000, 1704672000);

-- Insert moderation actions
INSERT INTO moderation_logs (id, action, target_type, target_uri, feed_id, moderator_did, reason, performed_at) VALUES
('mod-001', 'hide_post', 'post', 'at://did:plc:spammer/app.bsky.feed.post/spam001', 'feed-anime-general', 'did:plc:user001', 'Spam content promoting external sales', 1704585700),
('mod-002', 'hide_post', 'post', 'at://did:plc:troll/app.bsky.feed.post/troll001', 'feed-tech-ai', 'did:plc:user004', 'Inflammatory content without constructive discussion', 1704672100),
('mod-003', 'block_user', 'user', 'did:plc:spammer', 'feed-anime-general', 'did:plc:owner123', 'Repeated spam violations', 1704585800);

-- Insert feed blocklist
INSERT INTO feed_blocklist (feed_id, blocked_user_did, reason, blocked_by_did, blocked_at) VALUES
('feed-anime-general', 'did:plc:spammer', 'Repeated spam violations', 'did:plc:owner123', 1704585800),
('feed-tech-ai', 'did:plc:troll', 'Harassment and inflammatory posts', 'did:plc:user004', 1704672200);
