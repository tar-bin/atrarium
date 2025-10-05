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
| **月額** | $30-150 | **$0.40-5** | **92-99%** |
| **年額** | $360-1,800 | **$5-60** | **92-99%** |
| **週間作業時間** | 5時間 | **1時間** | **80%** |

*注記: 1000コミュニティで月額$0.40（Durable Objects + Queuesのみ）、Workers Paidプラン込みで月額$5*

---

## 🏗️ アーキテクチャ（PDS-First）

```
PDS（信頼できる情報源）
  ↓ Firehose: Jetstream WebSocket
FirehoseReceiver（Durable Object）
  ↓ 軽量フィルター: includes('#atr_')
Cloudflare Queue
  ↓ バッチ処理: 100 msg/batch
FirehoseProcessor（Queue Consumer Worker）
  ↓ 重量フィルター: regex /#atr_[0-9a-f]{8}/
CommunityFeedGenerator（コミュニティごとのDurable Object）
  ↓ ストレージ: config:, member:, post:, moderation:
Feed Generator API（getFeedSkeleton）
  ↓
クライアント（Bluesky AppViewがポスト内容を取得）
```

**主要原則**:
- **PDSが信頼できる情報源**: すべてのコミュニティデータはAT Protocol Lexiconを使用してユーザーPDSに保存
- **Durable Objects Storage**: 7日間保持のコミュニティごとのフィードインデックス
- **キューベース処理**: 効率的なFirehose取り込みのための2段階フィルタリング
- **データベースコストゼロ**: D1/KV不使用、Durable Objects Storageのみ（1000コミュニティで月額約$0.40）

### 技術スタック

**バックエンド（実装済み）**:
- **Cloudflare Workers**: Honoフレームワークによるサーバーレスエッジコンピューティング
- **Durable Objects**: 永続的Storage APIを持つコミュニティごとのフィードジェネレーター
- **Cloudflare Queues**: Firehoseイベント処理（5000 msg/sec容量）
- **AT Protocol**: `@atproto/api`（AtpAgent）、`@atproto/identity`
- **TypeScript 5.7**: Zodバリデーションによる厳格な型安全性
- **Vitest**: `@cloudflare/vitest-pool-workers`によるテスト

**フロントエンド（実装済み）**:
- **React 19 + TypeScript**: モダンReactによる管理ダッシュボード
- **TanStack Router**: 型安全なパラメータを持つファイルベースルーティング
- **TanStack Query**: キャッシング付きサーバー状態管理
- **shadcn/ui**: アクセシブルなUIコンポーネント（Radix UI + Tailwind CSS）
- **Vite**: 高速ビルドツールとHMR
- **Cloudflare Pages**: ダッシュボードホスティング（無料）

**外部サービス**:
- **AT Protocol**: `@atproto/api`（AtpAgent）、`@atproto/identity`
- **Bluesky Firehose**: Jetstream WebSocket（リアルタイムイベントストリーミング）
- **Local PDS**: DevContainerによるテスト統合

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

# Cloudflare Queueを作成（Firehose処理用）
wrangler queues create firehose-events
wrangler queues create firehose-dlq  # デッドレターキュー

# Durable Objectsは初回デプロイ時に自動プロビジョニング
# データベースセットアップは不要（PDS-firstアーキテクチャ）

# シークレットを設定（本番デプロイ用）
wrangler secret put JWT_SECRET
wrangler secret put BLUESKY_HANDLE         # PDS書き込み操作用
wrangler secret put BLUESKY_APP_PASSWORD   # PDS書き込み操作用
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
# Cloudflare Workersにデプロイ（Durable Objects + Queues含む）
npm run deploy

# 本番ログを表示
wrangler tail --format pretty

# Durable Objectsを監視
wrangler tail --format json | grep "CommunityFeedGenerator"

# Queue処理を監視
wrangler tail --format json | grep "FirehoseProcessor"
```

### ダッシュボードセットアップ

Atrariumダッシュボードは、コミュニティ、フィード、モデレーションを管理するためのWebインターフェースを提供します。

```bash
# ダッシュボードディレクトリに移動
cd dashboard

# 依存関係をインストール
npm install

# 環境ファイルを作成
cp .env.example .env.development

# .env.developmentを設定で編集
# VITE_API_URL=http://localhost:8787
# VITE_PDS_URL=http://localhost:3000

# ダッシュボード開発サーバーを起動
npm run dev
# http://localhost:5173 にアクセス
```

**ダッシュボード機能**:
- 🏘️ コミュニティ管理（作成、表示、設定）
- 📡 ユニークハッシュタグ付きフィード管理
- ✍️ ローカルBluesky PDS経由でフィードに投稿
- 🛡️ コンテンツモデレーション（ポスト非表示、ユーザーブロック）
- 📊 モデレーションログと統計
- 🌐 i18nサポート（英語/日本語）

詳細なダッシュボードドキュメントは[dashboard/README.md](./dashboard/README.md)をご覧ください。

### ローカルPDSでのテスト

Atrariumは、テスト用にローカルBluesky PDSを使用したDevContainerを使用します:

```bash
# VS Code DevContainerでプロジェクトを開く
# PDSは自動的に http://localhost:3000 で起動

# テストアカウントをセットアップ
.devcontainer/setup-pds.sh

# PDS統合テストを実行
npx vitest run tests/integration/pds-posting.test.ts
npx vitest run tests/integration/pds-to-feed-flow.test.ts
```

**テストデータ**は、PDS書き込み操作を通じて動的に作成されます（SQLシードは不要）。

---

## 📖 ドキュメント

- **[ドキュメントサイト](https://docs.atrarium.net)** - 完全なドキュメント（EN/JA）
- [CLAUDE.md](./CLAUDE.md) - Claude Code用開発ガイド
- [specs/006-pds-1-db/](./specs/006-pds-1-db/) - PDS-firstアーキテクチャ仕様
  - [spec.md](./specs/006-pds-1-db/spec.md) - 機能要件
  - [data-model.md](./specs/006-pds-1-db/data-model.md) - AT Protocol Lexiconスキーマ
  - [plan.md](./specs/006-pds-1-db/plan.md) - 実装計画
  - [quickstart.md](./specs/006-pds-1-db/quickstart.md) - Alice-Bobシナリオウォークスルー

### APIエンドポイント

**AT Protocol Feed Generator**（公開）:
- `GET /.well-known/did.json` - DIDドキュメント（`did:web:atrarium.net`）
- `GET /xrpc/app.bsky.feed.describeFeedGenerator` - フィードジェネレーターメタデータ
- `GET /xrpc/app.bsky.feed.getFeedSkeleton` - フィードスケルトン（ポストURI、Durable Objectへプロキシ）

**Dashboard API**（JWT認証が必要）:
- `POST /api/auth/login` - Bluesky DIDでログイン
- `GET /api/communities` - コミュニティ一覧（Durable Objectsから）
- `POST /api/communities` - コミュニティ作成（PDSへ書き込み + Durable Object作成）
- `POST /api/communities/:id/memberships` - コミュニティに参加（PDSへ書き込み）
- `POST /api/moderation/hide` - ポストを非表示（PDSへ書き込み）
- `POST /api/moderation/block` - ユーザーをブロック（PDSへ書き込み）

---

## 🎯 ユースケース

### ケース1: Misskeyからの移行

**移行前:**
- 20人のプログラミングコミュニティ
- 月額$45のサーバーコスト
- 週5時間のメンテナンス
- 衰退への不安

**移行後:**
- 月額$0.40-5で安定運用（規模依存）
- 週1時間未満の管理
- Blueskyユーザーによる発見
- DIDベースの柔軟な移行

**削減効果:** 年間$475-1,740 + 年間208時間

### ケース2: 新規コミュニティの立ち上げ

**従来の課題:**
- 技術的障壁（Mastodon/Misskeyのセットアップ）
- 初期メンバー獲得の難しさ
- 運用コストへの懸念

**Atrariumでは:**
- 技術的障壁ゼロ（カスタムフィード作成のみ）
- Blueskyからの自然な流入
- 月額$0.40でスタート（Workers Paid込みで月額$5まで拡張）
- 成長に応じた段階的な機能拡張

### ケース3: 小規模コミュニティエコシステム

**価値:**
- 複数の小規模コミュニティが相互接続
- モデレーション知識の共有
- インフラコストの分散
- 独立しながらも孤立しない

---

## 🌟 実装済み機能

### 1. PDS-Firstデータアーキテクチャ ✅
- **AT Protocol Lexiconスキーマ**: `net.atrarium.community.config`、`net.atrarium.community.membership`、`net.atrarium.moderation.action`
- **PDSが信頼できる情報源**: すべてのコミュニティデータはユーザーPDSに保存
- **Durable Objects Storage**: コミュニティごとのフィードインデックス（7日間保持）
- **AtpAgent統合**: `@atproto/api`経由のPDS読み書き操作

### 2. Feed GeneratorとFirehose処理 ✅
- **AT Protocol Feed Generator**: DIDドキュメント、getFeedSkeleton、describeFeedGenerator
- **FirehoseReceiver DO**: Jetstream WebSocket → Cloudflare Queue（軽量フィルター）
- **FirehoseProcessor Worker**: 重量正規表現フィルター付きQueue消費者
- **CommunityFeedGenerator DO**: RPCインターフェース付きコミュニティごとのフィードインデックス
- **2段階フィルタリング**: `includes('#atr_')` → `regex /#atr_[0-9a-f]{8}/`

### 3. コミュニティ & メンバーシップ管理 ✅
- **ハッシュタグシステム**: システム生成の一意なハッシュタグ（`#atr_[0-9a-f]{8}`）
- **ロールベースアクセス**: PDSに保存されるオーナー/モデレーター/メンバーの役割
- **コミュニティライフサイクル**: テーマ → コミュニティ → 卒業のステージ
- **メンバーシップレコード**: Durable Objectキャッシング付きPDS保存メンバーシップ

### 4. モデレーションシステム ✅
- **ポスト非表示/再表示**: PDSに保存されるモデレーションアクション
- **ユーザーブロック**: モデレーションログ付きフィードレベルブロックリスト
- **役割強制**: モデレーターとオーナーのみがモデレート可能
- **モデレーション履歴**: すべてのアクションは`net.atrarium.moderation.action`で追跡

### 5. セキュリティと認証 ✅
- **JWT認証**: ダッシュボード用のDIDベース認証
- **ロールベースアクセス制御**: オーナー/モデレーター/メンバー権限
- **CORS設定**: セキュアなクロスオリジンリクエスト
- **Lexiconバリデーション**: すべてのAT ProtocolレコードのZodスキーマ

### 6. テストとドキュメント ✅
- **コントラクトテスト**: Durable Objects、Queue消費者、PDS操作
- **統合テスト**: Queue-to-feedフロー、PDS-to-feedフロー
- **ローカルPDS統合**: テスト用Bluesky PDS付きDevContainer
- **VitePressドキュメント**: Cloudflare Pagesにデプロイされた20ページ（EN/JA）

---

## 🗺️ ロードマップ

### Phase 0: MVP ✅（完了）
- [x] AT Protocol Feed Generator API（DID、getFeedSkeleton、describeFeedGenerator）
- [x] AT Protocol Lexiconスキーマ（`net.atrarium.*`）
- [x] PDS読み書きサービス（AtpAgent統合）
- [x] ハッシュタグベースコミュニティシステム（`#atr_[0-9a-f]{8}`）
- [x] モデレーションシステム（ポスト非表示、ユーザーブロック）
- [x] DID検証によるJWT認証
- [x] 包括的なテストスイート（コントラクト + 統合 + PDSテスト）
- [x] VitePressドキュメント（20ページ、EN/JA）
- [x] Reactダッシュボード（Phase 0-1: コミュニティ/フィード/モデレーションUI）

### Phase 1: PDS-Firstアーキテクチャ ✅（完了 - Feature 006-pds-1-db）
- [x] **Durable Objects Storage**: コミュニティごとのフィードジェネレーター
- [x] **Cloudflare Queues**: Firehoseイベント処理（5000 msg/sec）
- [x] **FirehoseReceiver DO**: Jetstream WebSocket → Queue
- [x] **FirehoseProcessor Worker**: 2段階フィルタリング付きQueue消費者
- [x] **CommunityFeedGenerator DO**: Storage API付きコミュニティごとのフィードインデックス
- [x] **PDS統合**: すべての書き込みはまずPDSへ、その後Firehose経由でインデックス
- [x] **コスト最適化**: 1000コミュニティで月額$0.40（D1の月額$5と比較）

### Phase 2: 本番デプロイ（次期）
- [ ] **Firehose接続監視**: 自動再接続とヘルスチェック
- [ ] **ダッシュボードAPI統合**: PDS-firstエンドポイントを使用するようダッシュボードを更新
- [ ] **本番デプロイ**: Durable Objects + QueueをCloudflareにデプロイ
- [ ] **Feed Generator登録**: Bluesky AppViewに登録
- [ ] **モニタリング & アラート**: Durable Objects + Queueメトリクス
- [ ] **パフォーマンス最適化**: フィード生成<200msターゲット

### Phase 3: エコシステムとスケール（将来）
- [ ] **アチーブメントシステム**: PDSに保存されるユーザーアチーブメント
- [ ] **動的フィードミキシング**: 80%自分 / 15%親 / 5%グローバル
- [ ] **Starter Packs統合**: コミュニティオンボーディング
- [ ] **分析ダッシュボード**: Durable Objectsデータからのアクティビティトレンド
- [ ] **コミュニティ卒業**: テーマからコミュニティへの自動昇格
- [ ] **高度なモデレーション**: 報告ワークフロー、異議申し立てシステム

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
  - Durable Objects、Queue消費者、APIエンドポイント用のコントラクトテスト
  - PDSワークフロー用の統合テスト
  - Workers環境用の`@cloudflare/vitest-pool-workers`を使用
- **アーキテクチャ**: PDS-first設計（PDSへ書き込み、Firehose経由でインデックス）
- **型定義**: [src/types.ts](src/types.ts)と[src/schemas/lexicon.ts](src/schemas/lexicon.ts)で型を定義
- **ドキュメント**: 主要な変更時はREADME、CLAUDE.md、VitePressドキュメントを更新
- **コミット**: 明確なメッセージで原子的なコミット

### プロジェクト構造

```
src/
├── index.ts                # エントリーポイント（Honoルーター + DO/Queueバインディング）
├── routes/                 # APIルートハンドラー（PDSへ書き込み、DOへプロキシ）
├── durable-objects/        # Durable Objects（CommunityFeedGenerator、FirehoseReceiver）
├── workers/                # Queue Consumer Workers（FirehoseProcessor）
├── services/               # ビジネスロジック（AT Protocolクライアント、認証）
├── schemas/                # Zodバリデーション（Lexicon + API）
└── types.ts                # TypeScript型定義

tests/
├── contract/               # APIコントラクトテスト（DOs、Queues、エンドポイント）
├── integration/            # エンドツーエンドワークフローテスト（PDS統合）
├── unit/                   # ユニットテスト（ユーティリティ、バリデーター）
└── helpers/                # テストユーティリティとセットアップ
```

---

## 📊 プロジェクトステータス

- **現在のフェーズ**: Phase 1完了（PDS-Firstアーキテクチャ） → Phase 2（本番デプロイ）
- **バックエンド**: ✅ 完全実装（Durable Objects + Queues + AT Protocol統合）
- **フロントエンド**: ✅ ダッシュボード完成（React 19 + TanStack + shadcn/ui）
- **アーキテクチャ**: ✅ Durable Objects Storageを使用したPDS-first（D1/KV不使用）
- **テスト**: ✅ コントラクト + 統合 + ユニット + PDSテスト合格
- **ドキュメント**: ✅ [VitePressサイト](https://docs.atrarium.net)（20ページ、EN/JA）
- **ドメイン**: ✅ atrarium.net取得・設定完了
- **次のマイルストーン**: 本番デプロイ + Firehose接続
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
