---
title: システム設計
description: Atrariumのアーキテクチャと技術設計
order: 1
---

# システム設計

**最終更新**: 2025-10-02
**バージョン**: 2.0

## 目次

1. [アーキテクチャ概要](#アーキテクチャ概要)
2. [技術スタック](#技術スタック)
3. [データベース設計](#データベース設計)
4. [API設計](#api設計)
5. [ライフサイクル仕様](#ライフサイクル仕様)
6. [アチーブメントシステム](#アチーブメントシステム)
7. [オーナー不在時の処理](#オーナー不在時の処理)
8. [セキュリティと認証](#セキュリティと認証)

## 🏗️ アーキテクチャ概要

### 全体構成

```
┌──────────────────────────────────────────┐
│  Cloudflare Workers                      │
│  - Feed Generator API                    │
│  - フィルタリングロジック                │
│  - 認証・認可                           │
└──────────────┬───────────────────────────┘
               │
        ┌──────┴────────┐
        │               │
┌───────▼──────┐  ┌────▼─────────────┐
│ Cloudflare   │  │  Bluesky          │
│ Workers KV   │  │  Firehose         │
│ - 投稿キャッシュ│  │  - 投稿ストリーム│
│               │  │  - 無料           │
│ Cloudflare   │  └───────────────────┘
│ D1 Database  │           │
│ - メタデータ │           ↓
│ - 設定       │  ┌───────────────────────┐
└──────────────┘  │  ユーザーのPDS         │
       ↑          │  - 投稿データ         │
       │          │  - メディアblob       │
┌──────┴──────┐  │  - 真のデータ所有者   │
│  Durable    │  └───────────────────────┘
│  Objects    │
│ - Firehose  │
│   接続維持  │
└─────────────┘
```

### データフロー

**投稿取り込み**:
1. Firehose WebSocket → Durable Objectが投稿受信
2. フィルタ適用（theme_feedsのfilter_configからハッシュタグ/キーワード/著者）
3. マッチした投稿URIをD1のpost_indexに書き込み
4. 投稿コンテンツをKVにキャッシュ（7日間TTL）
5. 統計情報更新（post_count、health_metrics）

**フィード取得**:
1. クライアントがfeed URIでgetFeedSkeletonリクエスト
2. D1クエリ: `SELECT uri FROM post_index WHERE feed_id = ? ORDER BY created_at DESC`
3. URI一覧をページネーションカーソル付きで返却
4. クライアントがBluesky AppViewから完全な投稿データ取得

## 🔧 技術スタック

### バックエンド（実装済み）
- **Cloudflare Workers**: Honoフレームワークでサーバーレスエッジコンピューティング
- **D1 Database**: SQLiteデータベース（6テーブル、インデックス付き）
- **KV Namespace**: 投稿メタデータキャッシュ（7日TTL）
- **TypeScript 5.7**: Zodバリデーションによる厳密な型安全性
- **Vitest**: `@cloudflare/vitest-pool-workers`でテスト

### フロントエンド（未実装）
- **React + Vite**: 管理ダッシュボード（未実装）
- **Cloudflare Pages**: ダッシュボードホスティング（無料）

### 外部サービス
- **AT Protocol**: Bluesky Firehose（無料）、AppView API
- **GitHub**: リポジトリホスティング、CI/CD

詳細は[英語版](/en/architecture/system-design)を参照してください。
