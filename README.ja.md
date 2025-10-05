# Atrarium

**AT Protocol上の小さなエコシステム**

Atrariumは、AT Protocol上に構築されたコミュニティ管理システムで、小規模コミュニティ（10〜200人）の運営者が、従来の連合型サーバーの運用負担なしに、持続可能で活気あるコミュニティを運営できるよう支援します。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![AT Protocol](https://img.shields.io/badge/AT%20Protocol-Compatible-blue)](https://atproto.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

[English](./README.md) | 日本語

---

## 🎯 Atrariumとは？

Atrariumは、Mastodon/Misskeyサーバーの高額な運用コストと技術的複雑さから小規模コミュニティ管理者を解放しながら、コミュニティの独立性を維持します。

### 主な特徴

- 🌱 **サーバー管理ゼロ**: Cloudflareのサーバーレスインフラ上で構築
- 💰 **92-99%のコスト削減**: 月額$30-150から**月額$0.40-5**へ
- ⏱️ **80%の時間削減**: 週5時間から**週1時間**へ
- 🔓 **真のデータ所有権**: DIDによるユーザーのデータ所有
- 🌐 **自然な発見**: Blueskyの3000万人以上のユーザーとつながる
- 🤖 **自動化された成長**: スマートなコミュニティライフサイクル管理

---

## 🚨 解決する課題

### Fediverse小規模サーバーの危機

小規模Mastodon/Misskeyサーバー（10〜200人）が直面する重大な課題:

| 課題 | 影響 |
|------|------|
| **高額な運用コスト** | 月額$30-150 + 週5時間 |
| **孤立と衰退** | 1〜2年以内に50-70%が閉鎖 |
| **連合リスク** | 大規模サーバーからいつでも切断される可能性 |
| **技術的複雑さ** | DB破損、SSL、アップデートなど |
| **法的責任** | 個人運営者がすべての責任を負う |

**市場規模**: 日本語圏Fediverseに450〜800の小規模インスタンス、75,000〜200,000人のユーザー

---

## 💡 Atrariumによる解決方法

### AT Protocolの活用

Atrariumは、AT Protocolの設計を活用してこれらの問題を根本的に解決します:

1. **共有インフラ**: Cloudflareの安定したプラットフォームがサーバー管理を不要に
2. **分散型ID (DID)**: アカウントはサーバーから独立、移行コストゼロ
3. **カスタムフィード**: 重い実装なしに柔軟なコミュニティ設計
4. **Blueskyネットワーク**: 3000万人以上のユーザーとの自然な発見

### コスト比較

| | Fediverse | Atrarium | 削減率 |
|---|-----------|----------|--------|
| **月額** | $30-150 | **$5** | **85-95%** |
| **年額** | $360-1,800 | **$60** | **85-95%** |
| **週間作業時間** | 5時間 | **1時間** | **80%** |

---

## 🏗️ アーキテクチャ

```
┌─────────────────────────┐
│  Cloudflare Workers     │ ← Feed Generator API (Hono)
│  - AT Protocol Endpoints│    • /.well-known/did.json
│  - Dashboard API        │    • /xrpc/app.bsky.feed.*
│  - Scheduled Jobs       │    • /api/* (Dashboard)
└──────────┬──────────────┘
           │
    ┌──────┴──────┐
    │             │
┌───▼──┐    ┌────▼─────┐
│ D1   │    │ KV Cache │
│ DB   │    │ (7 days) │
└──────┘    └──────────┘
```

### 技術スタック

**バックエンド（実装済み）**:
- **Cloudflare Workers**: Honoフレームワークによるサーバーレスエッジコンピューティング
- **D1 Database**: SQLiteデータベース（6テーブル、インデックス付き）
- **KV Namespace**: ポストメタデータキャッシュ（7日間TTL）
- **TypeScript 5.7**: Zodバリデーションによる厳格な型安全性
- **Vitest**: `@cloudflare/vitest-pool-workers`によるテスト

**フロントエンド（保留中）**:
- **React + Vite**: 管理ダッシュボード（未実装）
- **Cloudflare Pages**: ダッシュボードホスティング（無料）

**外部サービス**:
- **AT Protocol**: `@atproto/api`, `@atproto/xrpc-server`, `@atproto/identity`
- **Bluesky Firehose**: WebSocket（Durable Objects統合は保留中）

---

## 🚀 はじめ方

### 前提条件

- Node.js 18+
- Cloudflareアカウント（Workers Paid プラン - 月額$5）
- Blueskyアカウント

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/tar-bin/atrarium.git
cd atrarium

# 依存関係をインストール
npm install

# Wrangler CLIをインストール（未インストールの場合）
npm install -g wrangler
wrangler login

# Cloudflareリソースを作成
wrangler d1 create atrarium-db
wrangler kv:namespace create POST_CACHE

# wrangler.tomlを生成されたIDで更新
# [[d1_databases]]と[[kv_namespaces]]セクションのコメントを外す
# 上記コマンドのdatabase_idとnamespace idを追加

# データベーススキーマを適用
wrangler d1 execute atrarium-db --file=./schema.sql

# シークレットを設定（本番デプロイ用）
wrangler secret put JWT_SECRET
wrangler secret put BLUESKY_HANDLE      # オプション
wrangler secret put BLUESKY_APP_PASSWORD # オプション
```

### 開発

```bash
# Workersをローカルで実行（Miniflare使用）
npm run dev

# 型チェック
npm run typecheck

# テスト実行
npm test

# ウォッチモードでテスト実行
npm run test:watch

# コード品質
npm run lint
npm run format
```

### デプロイ

```bash
# Cloudflare Workersにデプロイ
npm run deploy

# 本番ログを表示
wrangler tail

# 本番データベースにクエリ
wrangler d1 execute atrarium-db --command "SELECT * FROM communities LIMIT 5"
```

---

## 📖 ドキュメント

- [CLAUDE.md](./CLAUDE.md) - Claude Code用開発ガイド
- [プロジェクト概要と設計思想](./docs/01-overview.md)
- [システム設計](./docs/02-system-design.md)
- [実装ガイド](./docs/03-implementation.md)
- [APIリファレンス](./docs/api-reference.md)
- [市場調査](./docs/market-research.md)

### APIエンドポイント

**AT Protocol Feed Generator**:
- `GET /.well-known/did.json` - DIDドキュメント
- `GET /xrpc/app.bsky.feed.describeFeedGenerator` - フィードジェネレーター説明
- `GET /xrpc/app.bsky.feed.getFeedSkeleton` - フィードスケルトン（ポストURI）

**Dashboard API**（JWT認証が必要）:
- `POST /api/auth/login` - Bluesky DIDでログイン
- `GET /api/communities` - コミュニティ一覧
- `POST /api/communities` - コミュニティ作成
- `GET /api/communities/:id/theme-feeds` - テーマフィード一覧
- `POST /api/communities/:id/theme-feeds` - テーマフィード作成
- `POST /api/posts` - ポストをインデックスに投稿
- `POST /api/communities/:id/memberships` - コミュニティに参加

---

## 🎯 ユースケース

### ケース1: Misskeyからの移行

**移行前:**
- 20人のプログラミングコミュニティ
- 月額$45のサーバーコスト
- 週5時間のメンテナンス
- 衰退への不安

**移行後:**
- 月額$5で安定運用
- 週1時間未満の管理
- Blueskyユーザーによる発見
- DIDベースの柔軟な移行

**削減効果:** 年間$480 + 年間208時間

### ケース2: 新規コミュニティの立ち上げ

**従来の課題:**
- 技術的障壁（Mastodon/Misskeyのセットアップ）
- 初期メンバー獲得の難しさ
- 運用コストへの懸念

**Atrariumでは:**
- 技術的障壁ゼロ（カスタムフィード作成のみ）
- Blueskyからの自然な流入
- 月額$5でスタート
- 成長に応じた段階的な機能拡張

### ケース3: 小規模コミュニティエコシステム

**価値:**
- 複数の小規模コミュニティが相互接続
- モデレーション知識の共有
- インフラコストの分散
- 独立しながらも孤立しない

---

## 🌟 実装済み機能

### 1. AT Protocol Feed Generator ✅
- **DIDドキュメント**: `did:web`ベースの識別
- **Feed Skeleton API**: カスタムフィード用のポストURIを返す
- **フィード説明**: フィード発見用のメタデータ
- AT Protocol Feed Generator仕様に完全準拠

### 2. コミュニティ管理 ✅
- **コミュニティ作成**: テーマ → コミュニティ → 卒業のステージ
- **メンバーシップシステム**: オーナー/モデレーター/メンバーの役割
- **テーマフィード**: コミュニティごとに複数のフィード
- **ヘルスメトリクス**: 7日間のポスト数とアクティブユーザー追跡
- **親子関係**: 階層的なコミュニティ構造

### 3. ポストインデックス ✅
- **ポスト投稿**: AT-URIをフィードにインデックス
- **KVキャッシュ**: 7日間TTLのポストメタデータ
- **多言語サポート**: BCP-47言語コード
- **メディア検出**: メディア添付ポストの追跡

### 4. 自動化（スケジュールジョブ） ✅
- **ポスト削除同期**: Blueskyから削除されたポストを削除（12時間ごと）
- **フィードヘルスチェック**: アクティビティメトリクスとステータスの更新
- **非アクティブ検出**: 非アクティブなフィードを自動アーカイブ（active → warning → archived）

### 5. セキュリティと認証 ✅
- **JWT認証**: ダッシュボード用のDIDベース認証
- **ロールベースアクセス制御**: オーナー/モデレーター/メンバー権限
- **CORS設定**: セキュアなクロスオリジンリクエスト
- **プリペアドステートメント**: SQLインジェクション防止

### 6. テスト ✅
- **コントラクトテスト**: APIエンドポイント検証（Dashboard + Feed Generator）
- **統合テスト**: エンドツーエンドワークフロー
- **Cloudflare Workers環境**: `@cloudflare/vitest-pool-workers`によるテスト

---

## 🗺️ ロードマップ

### Phase 0: MVP ✅（完了）
- [x] プロジェクト計画と市場調査
- [x] D1データベーススキーマ（6テーブル、インデックス付き）
- [x] AT Protocol Feed Generator API
- [x] コミュニティとテーマフィード管理
- [x] ロールベースアクセスのメンバーシップシステム
- [x] KVキャッシュによるポストインデックス
- [x] DID検証によるJWT認証
- [x] スケジュールジョブ（ポスト同期、ヘルスチェック）
- [x] 包括的なテストスイート（コントラクト + 統合）

### Phase 1: 本番準備（次期）
- [ ] **Reactダッシュボード**: コミュニティ/フィード管理のUI
- [ ] **Firehose統合**: Durable Objectsによるリアルタイムポストインデックス
- [ ] **本番デプロイ**: Cloudflare Workers + Pagesデプロイ
- [ ] **モニタリング & アラート**: エラートラッキングとパフォーマンス監視
- [ ] **アチーブメントシステム**: ユーザーアチーブメントとゲーミフィケーション
- [ ] **コミュニティディレクトリ**: コミュニティの発見と閲覧

### Phase 2: エコシステムとスケール（将来）
- [ ] **動的フィードミキシング**: 80%自分 / 15%親 / 5%グローバル
- [ ] **Starter Packs統合**: コミュニティオンボーディング
- [ ] **分析ダッシュボード**: アクティビティトレンドとインサイト
- [ ] **コミュニティ卒業**: テーマからコミュニティへの自動昇格
- [ ] **モデレーションツール**: 高度なモデレーションワークフロー

---

## 🤝 コントリビューション

コントリビューションを歓迎します！詳細は[CONTRIBUTING.md](./CONTRIBUTING.md)をご覧ください。

### コントリビューション方法

1. リポジトリをフォーク
2. フィーチャーブランチを作成（`git checkout -b feature/AmazingFeature`）
3. 変更をコミット（`git commit -m 'Add some AmazingFeature'`）
4. ブランチにプッシュ（`git push origin feature/AmazingFeature`）
5. プルリクエストを作成

### 開発ガイドライン

- **コードスタイル**: 既存のTypeScriptパターンに従う（[CLAUDE.md](./CLAUDE.md)参照）
- **テスト**: Vitestを使用してすべての新機能のテストを作成
  - APIエンドポイント用のコントラクトテスト
  - ワークフロー用の統合テスト
- **データベース**: D1クエリには常にプリペアドステートメントを使用
- **型定義**: [src/types.ts](src/types.ts)で型を定義（Entity + Row + API）
- **ドキュメント**: 主要な変更時はREADMEとCLAUDE.mdを更新
- **コミット**: 明確なメッセージで原子的なコミット

### プロジェクト構造

```
src/
├── index.ts           # エントリーポイント（Honoルーター + スケジュールジョブ）
├── routes/            # APIルートハンドラー
├── models/            # データベースモデル（D1クエリ）
├── services/          # ビジネスロジック（AT Protocol、認証、キャッシュ）
├── schemas/           # Zodバリデーションスキーマ
└── types.ts           # TypeScript型定義

tests/
├── contract/          # APIコントラクトテスト
├── integration/       # エンドツーエンドワークフローテスト
└── helpers/           # テストユーティリティとセットアップ
```

---

## 📊 プロジェクトステータス

- **現在のフェーズ**: Phase 0 → Phase 1 移行期
- **バックエンド**: ✅ 実装・テスト済み（すべてのコアAPI動作中）
- **フロントエンド**: 🚧 ダッシュボード実装保留中
- **データベース**: ✅ スキーマ完成（6テーブル、全マイグレーション完了）
- **テスト**: ✅ 11テストファイル合格（コントラクト + 統合）
- **デプロイ**: 🚧 本番設定保留中
- **初回リリース目標**: 2025年Q2

---

## 💬 コミュニティ

- **GitHub**: [tar-bin/atrarium](https://github.com/tar-bin/atrarium)
- **Discussions**: [GitHub Discussions](https://github.com/tar-bin/atrarium/discussions)
- **Issues**: [GitHub Issues](https://github.com/tar-bin/atrarium/issues)
- **Bluesky**: [@atrarium.community](https://bsky.app/profile/atrarium.community)

---

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルをご覧ください。

---

## 🙏 謝辞

- [AT Protocol](https://atproto.com/) by Blueskyに基づいて構築
- [Cloudflare Workers](https://workers.cloudflare.com/)により稼働
- Fediverse小規模サーバー運営者が直面する課題からインスピレーションを得ています

---

## 📚 関連プロジェクト

- [atproto](https://github.com/bluesky-social/atproto) - AT Protocol TypeScript実装（このプロジェクトで使用）
- [feed-generator](https://github.com/bluesky-social/feed-generator) - 公式Feed Generatorスターターキット
- [Hono](https://hono.dev/) - Cloudflare Workers向け超高速Webフレームワーク

---

**Atrarium** - *AT Protocol上の小さなエコシステム*

世界中の小規模コミュニティ管理者のために ❤️ で作られています
