---
title: クイックスタート
description: Atrariumの一般的なタスクのクイックリファレンス
order: 3
---

# クイックスタート

一般的なタスクと操作のクイックリファレンスです。

## コミュニティ作成

```bash
# API経由（JWTトークン必要）
curl -X POST https://your-worker.workers.dev/api/communities \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TypeScript愛好会",
    "stage": "theme",
    "parent_id": null
  }'
```

## テーマフィード作成

```bash
curl -X POST https://your-worker.workers.dev/api/feeds \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "community_id": 1,
    "name": "TypeScript Tips",
    "filter_config": {
      "hashtags": ["#TypeScript", "#TS"],
      "keywords": ["typescript", "ts"],
      "authors": []
    }
  }'
```

## フィードスケルトン取得

```bash
# Feed Generator APIエンドポイント
curl "https://your-worker.workers.dev/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:xxx/app.bsky.feed.generator/feed-id&limit=50"
```

## メンバーシップ管理

```bash
# コミュニティにメンバー追加
curl -X POST https://your-worker.workers.dev/api/communities/1/members \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_did": "did:plc:xxx",
    "role": "member"
  }'
```

## データベースクエリ

```bash
# 全コミュニティ一覧
wrangler d1 execute atrarium-db --command "SELECT * FROM communities"

# テーマフィード表示
wrangler d1 execute atrarium-db --command "SELECT * FROM theme_feeds"

# コミュニティヘルスチェック
wrangler d1 execute atrarium-db --command "
  SELECT
    c.name,
    c.stage,
    c.health_metrics,
    COUNT(m.user_did) as member_count
  FROM communities c
  LEFT JOIN memberships m ON c.id = m.community_id
  GROUP BY c.id
"
```

## ログモニタリング

```bash
# リアルタイムログ
wrangler tail --format pretty

# ステータスでフィルタ
wrangler tail --status error
```

## テストワークフロー

### フィード生成テスト

```bash
# 1. テストデータ投入
wrangler d1 execute atrarium-db --file=seeds/test-data.sql

# 2. フィードスケルトンテスト実行
npm test -- feed-skeleton.test.ts

# 3. 出力確認
curl "http://localhost:8787/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:test/app.bsky.feed.generator/test-feed"
```

### メンバーシップフローテスト

```bash
# 1. コミュニティ作成
# 2. メンバー追加
# 3. ロール確認
npm test -- membership.test.ts
```

## 一般的なパターン

### TypeScript型

```typescript
import { Community, ThemeFeed, FilterConfig } from './types'

// フィルタ設定作成
const filter: FilterConfig = {
  hashtags: ['#React', '#Vue'],
  keywords: ['component', 'hooks'],
  authors: ['did:plc:example']
}

// ステージ付きコミュニティ
const community: Community = {
  id: 1,
  name: 'フロントエンド開発者',
  stage: 'community',
  parent_id: null,
  feed_mix: { own: 80, parent: 15, global: 5 },
  health_metrics: { /* ... */ }
}
```

### エラーハンドリング

```typescript
try {
  const response = await fetch('/api/communities', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const result = await response.json()
} catch (error) {
  console.error('コミュニティ作成失敗:', error)
}
```

## パフォーマンスTips

### キャッシング戦略

- **投稿URI**: KVに7日間キャッシュ
- **フィードスケルトン**: サーバー側キャッシュなし（オンデマンド取得）
- **ユーザーDID**: リクエストライフサイクル中メモリキャッシュ

### レート制限

- Feed Generator API: 100リクエスト/時/ユーザー（予定）
- Dashboard API: 1000リクエスト/時/ユーザー（予定）

### 最適化

```typescript
// D1にプリペアドステートメント使用
const stmt = env.DB.prepare(
  'SELECT * FROM communities WHERE stage = ?'
).bind('theme')

const results = await stmt.all()
```

## デプロイチェックリスト

- [ ] wrangler.tomlを本番IDで更新
- [ ] 全シークレット設定（JWT_SECRET, Bluesky認証情報）
- [ ] データベーススキーマを本番D1に適用
- [ ] workersデプロイ: `npm run deploy`
- [ ] DIDドキュメントエンドポイント確認
- [ ] Feed generatorをBlueskyに登録
- [ ] Blueskyクライアントでフィードテスト

## 便利なリンク

- [システムアーキテクチャ](/ja/architecture/system-design)
- [データベーススキーマ](/ja/architecture/database)
- [APIリファレンス](/ja/reference/api-reference)
- [実装ガイド](/ja/reference/implementation)
