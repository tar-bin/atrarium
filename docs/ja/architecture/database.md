---
title: データベーススキーマ
description: Atrarium D1データベース構造と設計
order: 2
---

# データベーススキーマ

AtrariumはCloudflare D1（SQLite）を構造化データストレージに使用しています。

## スキーマ概要

データベースは4つの主要テーブルで構成されています：

1. **communities** - コミュニティメタデータと設定
2. **theme_feeds** - 投稿フィルタリング用のフィード設定
3. **memberships** - ユーザーメンバーシップとロール
4. **post_index** - フィード生成用の投稿URIインデックス

## テーブル定義

### communities

コミュニティメタデータ、ライフサイクルステージ、ヘルスメトリクスを保存。

```sql
CREATE TABLE communities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  stage TEXT NOT NULL CHECK(stage IN ('theme', 'community', 'graduated')),
  parent_id INTEGER,
  feed_mix TEXT NOT NULL DEFAULT '{"own":80,"parent":15,"global":5}',
  health_metrics TEXT NOT NULL DEFAULT '{}',
  member_count INTEGER NOT NULL DEFAULT 0,
  post_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (parent_id) REFERENCES communities(id)
);

CREATE INDEX idx_communities_stage ON communities(stage);
CREATE INDEX idx_communities_parent ON communities(parent_id);
```

**フィールド**:
- `id`: 自動インクリメント主キー
- `name`: コミュニティ表示名
- `stage`: ライフサイクルステージ（theme/community/graduated）
- `parent_id`: 親コミュニティへの参照（ネスト構造用）
- `feed_mix`: フィード構成比のJSON設定
- `health_metrics`: JSONメトリクス（activity_score、growth_rate、engagement）
- `member_count`: キャッシュされたメンバー数
- `post_count`: キャッシュされた投稿数

### theme_feeds

投稿フィルタリング用のフィード設定。

```sql
CREATE TABLE theme_feeds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  community_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  feed_uri TEXT NOT NULL UNIQUE,
  filter_config TEXT NOT NULL,
  health_metrics TEXT NOT NULL DEFAULT '{}',
  post_count INTEGER NOT NULL DEFAULT 0,
  last_post_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE
);

CREATE INDEX idx_theme_feeds_community ON theme_feeds(community_id);
CREATE UNIQUE INDEX idx_theme_feeds_uri ON theme_feeds(feed_uri);
```

**filter_config構造**:
```json
{
  "hashtags": ["#TypeScript", "#React"],
  "keywords": ["webdev", "frontend"],
  "authors": ["did:plc:xxx", "did:plc:yyy"]
}
```

### memberships

コミュニティのユーザーメンバーシップとロール。

```sql
CREATE TABLE memberships (
  community_id INTEGER NOT NULL,
  user_did TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('owner', 'moderator', 'member')),
  joined_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (community_id, user_did),
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE
);

CREATE INDEX idx_memberships_user ON memberships(user_did);
CREATE INDEX idx_memberships_role ON memberships(community_id, role);
```

**ロール**:
- `owner`: 完全制御（フィード作成、メンバー管理、コミュニティ削除）
- `moderator`: モデレーション権限（投稿承認、メンバー管理）
- `member`: 閲覧のみアクセス

### post_index

フィード生成用の投稿URIインデックス。

```sql
CREATE TABLE post_index (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_id INTEGER NOT NULL,
  uri TEXT NOT NULL,
  author_did TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  has_media INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (feed_id) REFERENCES theme_feeds(id) ON DELETE CASCADE
);

CREATE INDEX idx_post_index_feed ON post_index(feed_id, created_at DESC);
CREATE INDEX idx_post_index_uri ON post_index(uri);
CREATE INDEX idx_post_index_author ON post_index(author_did);
```

**設計ノート**:
- URI（参照）のみ保存、コンテンツは保存しない
- コンテンツはAT Protocol経由でユーザーのPDSから取得
- フィードスケルトンクエリ用に最適化されたインデックス

## 一般的なクエリ

### フィードスケルトン取得

```sql
SELECT uri
FROM post_index
WHERE feed_id = ?
ORDER BY created_at DESC
LIMIT 50
OFFSET ?
```

### コミュニティヘルスチェック

```sql
SELECT
  c.name,
  c.stage,
  c.member_count,
  c.post_count,
  json_extract(c.health_metrics, '$.activity_score') as activity
FROM communities c
WHERE c.stage = 'theme'
  AND json_extract(c.health_metrics, '$.activity_score') < 0.3
```

### ユーザーのコミュニティ

```sql
SELECT
  c.id,
  c.name,
  c.stage,
  m.role
FROM communities c
JOIN memberships m ON c.id = m.community_id
WHERE m.user_did = ?
ORDER BY m.joined_at DESC
```

詳細は[英語版](/en/architecture/database)を参照してください。
