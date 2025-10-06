# Translation Guide (EN → JA)

This document provides translation guidelines for technical terms used in Atrarium documentation.

## General Principles

- **Technical terms**: Keep widely-used technical terms in English (no forced translation)
- **Proper nouns**: Keep service names, protocol names, and product names in English
- **API terms**: Keep API-related terminology in English for clarity
- **Consistency**: Use the same translation for the same term throughout all documents

## Technical Terms (Keep in English)

| English | Japanese | Notes |
|---------|----------|-------|
| source of truth | source of truth | **DO NOT translate** as "真実の源" - keep as English or katakana |
| Personal Data Server (PDS) | Personal Data Server（PDS） | Keep acronym, use full term on first mention |
| AT Protocol | AT Protocol | Protocol name, keep in English |
| Bluesky | Bluesky | Service name |
| Feed Generator | Feed Generator | Technical component name |
| Firehose | Firehose | AT Protocol component name |
| Durable Objects | Durable Objects | Cloudflare service name |
| AppView | AppView | AT Protocol component name |
| DID (Decentralized Identifier) | DID（分散型識別子） | Keep acronym, translate full term |
| Cloudflare Workers | Cloudflare Workers | Service name |
| Cloudflare Queue | Cloudflare Queue | Service name |

## Product/Service Names (Keep in English)

| English | Japanese | Notes |
|---------|----------|-------|
| Fediverse | Fediverse | Keep in English |
| Mastodon | Mastodon | Software name |
| Misskey | Misskey | Software name |
| Discord | Discord | Platform name |
| VitePress | VitePress | Tool name |
| React | React | Framework name |
| TypeScript | TypeScript | Language name |

## Translated Terms

| English | Japanese | Notes |
|---------|----------|-------|
| community | コミュニティ | |
| feed | フィード | |
| post | 投稿 | |
| member | メンバー | |
| membership | メンバーシップ | |
| moderation | モデレーション | |
| dashboard | ダッシュボード | |
| serverless | サーバーレス | |
| architecture | アーキテクチャ | |
| infrastructure | インフラストラクチャ | |
| deployment | デプロイメント | |
| scalability | スケーラビリティ | |
| sustainability | 持続可能性 | |

## Architecture Terms

| English | Japanese | Notes |
|---------|----------|-------|
| PDS-first architecture | PDS第一アーキテクチャ | |
| data flow | データフロー | |
| batch processing | バッチ処理 | |
| queue consumer | キューコンシューマー | |
| horizontal scaling | 水平スケーリング | |
| vertical scaling | 垂直スケーリング | |

## Phrases to Avoid

| ❌ Incorrect | ✅ Correct | Reason |
|-------------|-----------|--------|
| 真実の源 | source of truth | Technical term should remain in English |
| ソース・オブ・トゥルース | source of truth | Avoid katakana transliteration for this term |

## Notes

- When in doubt, keep technical terms in English to maintain clarity
- Use katakana (カタカナ) for terms that are commonly transliterated in Japanese tech writing
- Consistency across all documentation (README, VitePress docs, code comments) is critical
