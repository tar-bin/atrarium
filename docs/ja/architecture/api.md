---
title: API設計
description: AtrariumのAPIエンドポイントとFeed Generator仕様
order: 3
---

# API設計

Atrariumは2つのAPIを実装しています：

1. **Feed Generator API**（AT Protocol標準）
2. **Dashboard API**（内部管理用）

## Feed Generator API

AT ProtocolのFeed Generator仕様を実装しています。

### DIDドキュメント

**エンドポイント**: `GET /.well-known/did.json`

このフィードジェネレーターを識別するDIDドキュメントを返します。

**レスポンス**:
```json
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:web:atrarium.net",
  "service": [{
    "id": "#bsky_fg",
    "type": "BskyFeedGenerator",
    "serviceEndpoint": "https://atrarium.net"
  }]
}
```

### フィードスケルトン

**エンドポイント**: `GET /xrpc/app.bsky.feed.getFeedSkeleton`

フィードスケルトン（投稿URIのみ、コンテンツなし）を返します。

**パラメータ**:
- `feed`（必須）: フィードURI（at://did:plc:xxx/app.bsky.feed.generator/feed-id）
- `cursor`（任意）: ページネーションカーソル
- `limit`（任意）: 投稿数（デフォルト: 50、最大: 100）

**レスポンス**:
```json
{
  "feed": [
    { "post": "at://did:plc:xxx/app.bsky.feed.post/yyy" },
    { "post": "at://did:plc:zzz/app.bsky.feed.post/aaa" }
  ],
  "cursor": "1234567890"
}
```

## Dashboard API

内部管理API（JWT認証必須）。

### 認証

全Dashboard APIエンドポイントはAuthorizationヘッダーにJWTトークンが必要です：

```bash
curl -H "Authorization: Bearer $JWT_TOKEN" https://atrarium.net/api/communities
```

### コミュニティ

#### コミュニティ作成

**エンドポイント**: `POST /api/communities`

**リクエスト**:
```json
{
  "name": "TypeScript愛好会",
  "stage": "theme",
  "parent_id": null
}
```

#### コミュニティ一覧

**エンドポイント**: `GET /api/communities`

**クエリパラメータ**:
- `stage`（任意）: ステージでフィルタ（theme/community/graduated）
- `parent_id`（任意）: 親でフィルタ

詳細は[英語版](/en/architecture/api)を参照してください。
