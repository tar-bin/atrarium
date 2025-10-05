---
title: APIリファレンス
description: Atrariumの完全なAPIエンドポイントリファレンス
order: 1
---

# APIリファレンス

Atrariumの全APIエンドポイントの完全なリファレンスです。

::: tip
このページはクイックリファレンスです。詳細な設計と例は[API設計](/ja/architecture/api)を参照してください。
:::

## Feed Generator API

AT Protocol標準エンドポイント。

### GET /.well-known/did.json

このフィードジェネレーターを識別するDIDドキュメントを返します。

**レスポンス**: `application/json`

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

### GET /xrpc/app.bsky.feed.getFeedSkeleton

フィードスケルトン（投稿URIのみ）を返します。

**パラメータ**:
| 名前 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| `feed` | string | はい | フィードURI（at://...） |
| `cursor` | string | いいえ | ページネーションカーソル |
| `limit` | number | いいえ | 投稿数（デフォルト: 50、最大: 100） |

**レスポンス**: `application/json`

```json
{
  "feed": [
    { "post": "at://did:plc:xxx/app.bsky.feed.post/yyy" }
  ],
  "cursor": "1234567890"
}
```

## Dashboard API

内部管理API（JWT認証必須）。

::: warning 認証必須
全Dashboard APIエンドポイントは`Authorization: Bearer <token>`ヘッダーが必要です。
:::

### コミュニティ

#### POST /api/communities

新しいコミュニティを作成します。

**リクエストボディ**:
```json
{
  "name": "コミュニティ名",
  "stage": "theme",
  "parent_id": null
}
```

**レスポンス**: `201 Created`

#### GET /api/communities

コミュニティ一覧を取得します。

**クエリパラメータ**:
| 名前 | 型 | 説明 |
|------|------|-------------|
| `stage` | string | ステージでフィルタ（theme/community/graduated） |
| `parent_id` | number | 親コミュニティでフィルタ |

**レスポンス**: `200 OK`

詳細は[英語版](/reference/api-reference)を参照してください。

## エラーレスポンス

全エンドポイントは標準フォーマットでエラーを返します：

**レスポンス**: `4xx`または`5xx`

```json
{
  "error": "error_code",
  "message": "人間が読めるエラーメッセージ"
}
```

### 一般的なエラーコード

| コード | ステータス | 説明 |
|------|--------|-------------|
| `bad_request` | 400 | 無効なリクエストパラメータ |
| `unauthorized` | 401 | 認証が欠落または無効 |
| `forbidden` | 403 | 権限不足 |
| `not_found` | 404 | リソースが見つからない |
| `conflict` | 409 | リソース衝突（例: 重複名） |
| `internal_error` | 500 | サーバーエラー |

## 認証

### JWTトークンフォーマット

```json
{
  "did": "did:plc:xxx",
  "handle": "user.bsky.social",
  "iat": 1704067200,
  "exp": 1704153600
}
```

### トークン使用

```bash
curl -H "Authorization: Bearer eyJhbGc..." https://atrarium.net/api/communities
```

## レート制限

::: info フェーズ1で実装予定
レート制限は現在実装されていませんが、フェーズ1で予定されています。
:::

**予定制限**:
- Feed Generator API: 100リクエスト/時/ユーザー
- Dashboard API: 1000リクエスト/時/ユーザー

## 関連ドキュメント

- [API設計](/ja/architecture/api) - 詳細な設計と例
- [システムアーキテクチャ](/ja/architecture/system-design) - 全体アーキテクチャ
- [実装ガイド](/ja/reference/implementation) - 開発詳細
