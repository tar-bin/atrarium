---
title: 実装ガイド
description: Atrarium実装の詳細ガイド
order: 2
---

# 実装ガイド

Atrarium実装の詳細ガイドです。

このページでは、Atrariumの実装詳細について説明します。完全な実装計画については、元のドキュメント[docs/03-implementation.md](https://github.com/tar-bin/atrarium/blob/main/docs/03-implementation.md)を参照してください。

## 実装フェーズ

### フェーズ0（完了済み）
- D1データベーススキーマ
- 基本Feed Generator API
- ハッシュタグベースフィルタリング
- 投稿インデックス作成

### フェーズ1（進行中）
- メンバーシップ管理
- アチーブメントシステム
- 非アクティブフィードの自動アーカイブ

### フェーズ2（計画中）
- 動的フィード混合（80%自分 / 15%親 / 5%グローバル）
- コミュニティ卒業/分割

## 技術詳細

### Cloudflare Workers

```typescript
import { Hono } from 'hono'

const app = new Hono()

app.get('/.well-known/did.json', (c) => {
  return c.json({
    "@context": ["https://www.w3.org/ns/did/v1"],
    "id": `did:web:${c.req.header('host')}`,
    "service": [{
      "id": "#bsky_fg",
      "type": "BskyFeedGenerator",
      "serviceEndpoint": `https://${c.req.header('host')}`
    }]
  })
})

export default app
```

### D1クエリ

```typescript
// フィードスケルトン取得
const { results } = await env.DB.prepare(`
  SELECT uri FROM post_index
  WHERE feed_id = ?
  ORDER BY created_at DESC
  LIMIT ?
`).bind(feedId, limit).all()
```

詳細は[英語版](/reference/implementation)を参照してください。
