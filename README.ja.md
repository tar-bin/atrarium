# Atrarium

**AT Protocol上の小さなエコシステム**

> ⚠️ **ステータス**: 開発中。本番環境での使用はまだ準備できていません。

📖 **[ドキュメント](https://docs.atrarium.net/ja/)** | [English Documentation](https://docs.atrarium.net)

Atrariumは、AT Protocol上に構築されたコミュニティ管理システムで、小規模コミュニティ管理者（10〜200人）が、従来の連合型サーバーの運用負担なしに、持続可能で活気あるコミュニティを運営できるよう支援します。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![AT Protocol](https://img.shields.io/badge/AT%20Protocol-Compatible-blue)](https://atproto.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

---

## 🎯 Atrariumとは？

**Atrariumは、サーバーレスインフラストラクチャとメンバーシップベースのフィードフィルタリングを使用して、小規模でオープンなコミュニティ（10〜200人）がBluesky上で持続可能に運営できるようにします。**

小規模コミュニティサーバーは持続可能性の危機に直面しています。Fediverseインスタンス（Mastodon、Misskey）の運営には月額$30-150のコストと週5時間のメンテナンスが必要です。この運用負担により、小規模インスタンスの50-70%が1-2年以内に閉鎖され、数万人のユーザーがオンラインの居場所を失っています。

Atrariumは、AT Protocolの分散型アイデンティティ（DID）とCloudflareのサーバーレスインフラストラクチャを活用してこれを解決します。コミュニティは、サーバー管理ゼロと自動スケーリングにより、コストを**95%**（$0.40-5/月）、時間を**80%**（1時間/週）削減します。メンバーシップベースのフィルタリングを備えたカスタムフィードジェネレーターにより、Bluesky公式アプリで直接閲覧可能なコミュニティ固有のフィードを実現します—カスタムクライアント不要です。

📖 **[完全なコンセプトドキュメント](https://docs.atrarium.net/ja/guide/concept.html)** | [English](https://docs.atrarium.net/en/guide/concept.html)

### 独自のポジショニング

Atrariumはコミュニティプラットフォームの中で独自の位置を占めています：

| プラットフォーム | オープン性 | 運用負担 | メンバーシップフィルタリング |
|----------|----------|------------|----------------------|
| **Fediverse** | ✅ オープン | ❌ 高い（VPS、5時間/週） | ✅ インスタンスレベル |
| **Discord** | ❌ クローズド | ✅ 低い（管理済み） | ✅ サーバーレベル |
| **標準Bluesky** | ✅ オープン | ✅ 低い（管理済み） | ❌ フィルタリングなし |
| **Atrarium** | ✅ オープン | ✅ 低い（サーバーレス） | ✅ フィードレベル |

**主な差別化要因**：
- **vs Fediverse**: 運用負担なしのオープンコミュニティ（VPS不要、データベース不要）
- **vs Discord**: オープン/パブリックコミュニティでの低運用負担（プラットフォームロックインなし）
- **vs 標準Bluesky**: メンバーシップベースのフィードフィルタリング（標準フィードでは利用不可）

### 主な特徴

- 🌱 **サーバー管理ゼロ**: Cloudflare Workers + Durable Objects上に構築
- 💰 **95%のコスト削減**: $30-150/月 → $0.40-5/月
- ⏱️ **80%の時間削減**: 5時間/週 → 1時間/週
- 🔓 **分散型アイデンティティ**: DIDによりユーザーがデータを所有（サービス間で移植可能）
- 🎯 **メンバーシップフィルタリング**: ロールベースアクセスを備えたコミュニティ固有のフィード
- 📱 **Bluesky互換**: 公式Blueskyアプリ（iOS、Android、Web）で閲覧可能

---

## 💡 仕組み

### AT Protocol上に構築

AtrariumはAT Protocolの設計を活用して、これらの問題を根本的に解決します：

1. **共有インフラストラクチャ**: Cloudflareの安定したプラットフォームがサーバー管理を不要に
2. **分散型アイデンティティ（DID）**: アカウントはサーバーから独立、移行コストゼロ
3. **カスタムフィード**: 重い実装なしに柔軟なコミュニティ設計
4. **Blueskyネットワーク**: 3000万人以上のユーザーとの自然な発見

### コスト比較

| | Fediverse | Atrarium | 削減率 |
|---|-----------|----------|---------|
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

**主要原則**：
- **PDSが信頼できる情報源**: すべてのコミュニティデータはAT Protocol Lexiconを使用してユーザーPDSに保存
- **Durable Objects Storage**: 7日間保持のコミュニティごとのフィードインデックス
- **キューベース処理**: 効率的なFirehose取り込みのための2段階フィルタリング
- **データベースコストゼロ**: D1/KV不使用、Durable Objects Storageのみ（1000コミュニティで月額約$0.40）

### 技術スタック

**バックエンド（実装済み）**：
- **Cloudflare Workers**: Honoフレームワークによるサーバーレスエッジコンピューティング
- **oRPC**: 自動OpenAPI生成による型安全なRPC（`@orpc/server`、`@orpc/openapi`）
- **Durable Objects**: 永続的Storage APIを持つコミュニティごとのフィードジェネレーター
- **Cloudflare Queues**: Firehoseイベント処理（5000 msg/sec容量）
- **AT Protocol**: `@atproto/api`（AtpAgent）、`@atproto/identity`
- **TypeScript 5.7**: Zodバリデーションによる厳格な型安全性
- **Vitest**: `@cloudflare/vitest-pool-workers`によるテスト

**フロントエンド（実装済み）**：
- **React 19 + TypeScript**: モダンReactによる管理ダッシュボード
- **oRPCクライアント**: React Query統合による型安全なAPIクライアント（`@orpc/client`、`@orpc/react`）
- **TanStack Router**: 型安全なパラメータを持つファイルベースルーティング
- **TanStack Query**: キャッシング付きサーバー状態管理
- **shadcn/ui**: アクセシブルなUIコンポーネント（Radix UI + Tailwind CSS）
- **Vite**: 高速ビルドツールとHMR
- **Cloudflare Pages**: ダッシュボードホスティング（無料）

**外部サービス**：
- **AT Protocol**: `@atproto/api`（AtpAgent）、`@atproto/identity`
- **Bluesky Firehose**: Jetstream WebSocket（リアルタイムイベントストリーミング）
- **ローカルPDS**: テスト用のDevContainer統合

---

## 🚀 はじめに

### クイックスタート

```bash
# クローンとインストール
git clone https://github.com/tar-bin/atrarium.git
cd atrarium
npm install

# 開発
npm run dev          # Workersをローカルで起動
npm test             # テスト実行
npm run typecheck    # 型チェック
```

詳細なセットアップ手順については、[**はじめにガイド**](https://docs.atrarium.net/ja/guide/getting-started.html)を参照してください。

---

## 📖 ドキュメント

**[📚 ドキュメントサイト](https://docs.atrarium.net/ja/)** - 完全なガイドとAPIリファレンス（日本語/英語）

- [はじめに](https://docs.atrarium.net/ja/guide/getting-started.html)
- [アーキテクチャ概要](https://docs.atrarium.net/ja/architecture/)
- [APIリファレンス](https://docs.atrarium.net/ja/reference/api.html)
- [開発ガイド](https://docs.atrarium.net/ja/guide/development.html)

---

## 🎯 ユースケース

Atrariumは、小規模コミュニティ（10〜200人）が独立性を維持しながらコストを**92-99%**削減するのを支援します。

- **Fediverseからの移行**: データ損失やユーザーの摩擦なしにMastodon/Misskeyから移行
- **新規コミュニティ**: $0.40/月から開始し、成長に応じて$5/月までスケール
- **コミュニティネットワーク**: 共有インフラストラクチャで複数の小規模コミュニティを接続

詳細な例については、[ユースケース](https://docs.atrarium.net/ja/guide/use-cases.html)を参照してください。

---

## 🌟 機能

### コア機能 ✅
- **PDS第一アーキテクチャ**: すべてのデータをユーザーのPersonal Data Serverに保存
- **フィードジェネレーター**: AT Protocol準拠のカスタムフィード
- **Firehose処理**: Cloudflare Queues経由のリアルタイム投稿インデックス
- **コミュニティ管理**: ロールベースアクセスを備えたハッシュタグベースのコミュニティ
- **モデレーション**: 投稿非表示、ユーザーブロック、モデレーションログ
- **ダッシュボード**: コミュニティ/フィード/モデレーション管理用のReact Web UI

技術的な詳細については、[アーキテクチャ](https://docs.atrarium.net/ja/architecture/)を参照してください。

---

## 🗺️ ロードマップ

- **Phase 0-1** ✅ MVP & PDS第一アーキテクチャ（完了）
- **Phase 2** 🚧 本番デプロイメント（進行中）
- **Phase 3** 📅 エコシステム & スケール（計画中）

詳細については、[ロードマップ](https://docs.atrarium.net/ja/guide/roadmap.html)を参照してください。

---

## 🤝 貢献

貢献を歓迎します！以下については、[貢献ガイド](https://docs.atrarium.net/ja/guide/contributing.html)を参照してください：

- 開発環境のセットアップ
- コードスタイルガイドライン
- テスト要件
- プルリクエストプロセス

---

## 📊 プロジェクトステータス

- **フェーズ**: Phase 1完了 → Phase 2（本番デプロイメント）
- **リリース目標**: 2025年Q2
- **技術スタック**: Cloudflare Workers + Durable Objects + AT Protocol

詳細については、[プロジェクトステータス](https://docs.atrarium.net/ja/guide/project-status.html)を参照してください。

---

## 💬 コミュニティ & サポート

- **GitHub**: [tar-bin/atrarium](https://github.com/tar-bin/atrarium)
- **ディスカッション**: [GitHub Discussions](https://github.com/tar-bin/atrarium/discussions)

---

## 📄 ライセンス

MITライセンス - 詳細については[LICENSE](LICENSE)を参照してください。

---

**Atrarium** - *AT Protocol上の小さなエコシステム*

[AT Protocol](https://atproto.com/)で構築 • [Cloudflare Workers](https://workers.cloudflare.com/)でパワード
