---
title: データストレージアーキテクチャ
description: Atrarium PDS-firstデータストレージとDurable Objects
order: 2
---

# データストレージアーキテクチャ

Atrariumは**PDS-firstアーキテクチャ**を実装しており、すべての正式なデータはAT Protocol Lexiconスキーマを使用してユーザーのPersonal Data Server（PDS）に保存されます。Cloudflare Durable Objectsは、高速なフィード生成のための7日間のフィードインデックスキャッシュを提供します。

## アーキテクチャ概要

```
┌─────────────────────────────────────────┐
│  PDS（信頼できる情報源）                │
│  - net.atrarium.community.config        │
│  - net.atrarium.community.membership    │
│  - net.atrarium.moderation.action       │
└──────────────┬──────────────────────────┘
               │
               ↓ Firehose（Jetstream WebSocket）
┌──────────────────────────────────────────┐
│  FirehoseReceiver（Durable Object）      │
│  - 軽量フィルター: includes('#atr_')      │
└──────────────┬───────────────────────────┘
               │
               ↓ Cloudflare Queue（バッチ処理）
┌──────────────────────────────────────────┐
│  FirehoseProcessor（Queue Consumer）     │
│  - 重量フィルター: regex                  │
└──────────────┬───────────────────────────┘
               │
               ↓ RPC呼び出し
┌──────────────────────────────────────────┐
│  CommunityFeedGenerator（Durable Object）│
│  - Durable Objects Storage（7日間キャッシュ）│
│    • config:<communityId>                │
│    • member:<did>                        │
│    • post:<timestamp>:<rkey>             │
│    • moderation:<uri>                    │
└──────────────────────────────────────────┘
```

## ストレージレイヤー

### 1. PDS（永続ストレージ）

すべてのコミュニティデータは、AT Protocol Lexiconスキーマを使用してユーザーのPDSに保存されます。

#### net.atrarium.community.config

オーナーのPDSに保存されるコミュニティメタデータ。

```typescript
{
  $type: 'net.atrarium.community.config';
  name: string;              // コミュニティ名（最大100文字）
  hashtag: string;           // 一意なハッシュタグ: #atr_[0-9a-f]{8}
  stage: 'theme' | 'community' | 'graduated';
  parentCommunity?: string;  // 親configのAT-URI
  feedMix: {
    own: number;             // 0-1、合計 = 1.0
    parent: number;
    global: number;
  };
  moderators: string[];      // DID（最大50）
  createdAt: string;         // ISO 8601
  description?: string;      // 最大500文字
}
```

**AT-URI形式**: `at://did:plc:owner/net.atrarium.community.config/3jzfcijpj2z2a`

#### net.atrarium.community.membership

各メンバーのPDSに保存されるユーザーメンバーシップレコード。

```typescript
{
  $type: 'net.atrarium.community.membership';
  community: string;         // コミュニティconfigのAT-URI
  role: 'owner' | 'moderator' | 'member';
  joinedAt: string;          // ISO 8601
  active: boolean;
}
```

**AT-URI形式**: `at://did:plc:member/net.atrarium.community.membership/3k2j4xyz`

#### net.atrarium.moderation.action

モデレーターのPDSに保存されるモデレーションアクション。

```typescript
{
  $type: 'net.atrarium.moderation.action';
  action: 'hide_post' | 'unhide_post' | 'block_user' | 'unblock_user';
  target: string;            // AT-URIまたはDID
  community: string;         // コミュニティconfigのAT-URI
  reason?: string;           // オプションの説明
  createdAt: string;         // ISO 8601
}
```

**AT-URI形式**: `at://did:plc:moderator/net.atrarium.moderation.action/3m5n6pqr`

::: warning プライバシー警告
モデレーションアクションは**公開レコード**としてモデレーターのPDSに保存されます。`reason`フィールドには以下を含めないでください：
- 個人情報（メールアドレス、電話番号、住所など）
- 機密情報（内部通信、非公開のユーザー報告など）
- 誹謗中傷や攻撃的な表現

推奨される`reason`の例：
- ✅ "スパム投稿"
- ✅ "コミュニティガイドライン違反"
- ✅ "重複投稿"
- ❌ "ユーザーXXXからの通報により削除（メール: xxx@example.com）"
- ❌ "この投稿者は以前にも問題行動があった（内部記録参照）"
:::

### 2. Durable Objects Storage（7日間キャッシュ）

各コミュニティは、独立したストレージを持つ独自の`CommunityFeedGenerator` Durable Objectインスタンスを持ちます。

#### ストレージキー

**コミュニティ設定**:
- キー: `config:<communityId>`
- 値: `{ name, hashtag, stage, createdAt }`

**メンバーシップレコード**:
- キー: `member:<did>`
- 値: `{ did, role, joinedAt, active }`

**ポストインデックス**:
- キー: `post:<timestamp>:<rkey>`
- 値: `{ uri, authorDid, createdAt, moderationStatus, indexedAt }`

**モデレーションアクション**:
- キー: `moderation:<uri>`
- 値: `{ action, targetUri, reason, createdAt }`

#### ストレージ操作の例

```typescript
// ストレージにポストを書き込み
await storage.put(
  `post:${Date.now()}:${rkey}`,
  { uri, authorDid, createdAt, moderationStatus: 'approved', indexedAt: new Date().toISOString() }
);

// ポストを一覧表示（新しい順）
const posts = await storage.list<PostMetadata>({
  prefix: 'post:',
  reverse: true,
  limit: 50
});

// 古いポストを削除（7日間保持）
const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
await storage.delete(`post:${timestamp}:${rkey}`);
```

## データフロー

### 書き込みフロー（PDS → Firehose → Durable Object）

1. **ユーザーがPDSに投稿** コミュニティハッシュタグ付き（例: `#atr_a1b2c3d4`）
2. **Firehoseがイベントを発行** → FirehoseReceiver DO
3. **軽量フィルター**（`includes('#atr_')`）→ Cloudflare Queue
4. **FirehoseProcessor Worker** が重量正規表現フィルターを適用（`/#atr_[0-9a-f]{8}/`）
5. **CommunityFeedGenerator DO** がDurable Objects Storageにポストを保存

### 読み取りフロー（クライアント → Durable Object）

1. **クライアントがリクエスト** フィードURIで`getFeedSkeleton`
2. **Feed Generator API** がCommunityFeedGenerator DOへRPC呼び出し
3. **Durable Object** が新しい順でストレージをクエリ
4. **ポストURIを返す** ページネーションカーソル付き
5. **クライアントが取得** Bluesky AppViewから完全なポスト内容を取得

## パフォーマンス特性

### ストレージ制限

- **Durable Objects**: オブジェクトごと10GB（コミュニティごと約100万ポストで十分）
- **予想使用量**: 1000コミュニティ × 1万ポスト × 200バイト = 合計2GB
- **7日間保持**: スケジュールアラームによる自動クリーンアップ

### クエリパフォーマンス

- **フィードスケルトン**: < 10ms（Durable Objects Storageは高速）
- **メンバーシップチェック**: < 5ms（Durable Object内のインメモリマップ）
- **ポストインデックス**: < 50ms（ストレージへの書き込み + インデックス更新）

### コスト比較

| コンポーネント | D1アーキテクチャ | PDS-First（Durable Objects） | 削減率 |
|-----------|-----------------|---------------------------|---------|
| **データベース** | $5/月（D1有料） | $0（データベースなし） | 100% |
| **ストレージ** | D1に含まれる | $0.18/月（1000コミュニティ × 10MB） | - |
| **リクエスト** | D1に含まれる | Workers Paidに含まれる | - |
| **合計** | $5/月 | $0.40/月 | **92%** |

## 回復力と復旧

### Durable Objectsの耐久性

- **自動レプリケーション**: CloudflareがDurable Objects Storageをデータセンター間でレプリケート
- **クラッシュ復旧**: Workerクラッシュ後も状態が永続化
- **マイグレーション**: Durable Objectsはロケーション間で移行可能

### Firehoseからの再構築

Durable Objectストレージが失われた場合:

1. **Firehoseをリプレイ** カーソル0（または最古の利用可能なもの）から
2. **ポストを再インデックス** 影響を受けたコミュニティのみ
3. **7日間保持** データ損失を制限（古いポストはすでに期限切れ）

### PDSが信頼できる情報源

すべてのコミュニティメタデータとメンバーシップはPDSに残ります:
- すべてのDurable Objectsがクリアされてもデータ損失なし
- コミュニティオーナーは常に自分のPDSから復旧可能
- フィードインデックスはFirehoseから自動的に再構築

## 一般的な操作

### コミュニティ作成

```typescript
// 1. PDSに書き込み
const result = await agent.com.atproto.repo.createRecord({
  repo: agent.session.did,
  collection: 'net.atrarium.community.config',
  record: {
    $type: 'net.atrarium.community.config',
    name: 'TypeScript愛好者',
    hashtag: '#atr_a1b2c3d4',
    stage: 'theme',
    feedMix: { own: 0.8, parent: 0.15, global: 0.05 },
    moderators: [],
    createdAt: new Date().toISOString()
  }
});

// 2. Durable Objectインスタンスを作成
const communityId = result.uri.split('/').pop();
const stub = env.COMMUNITY_FEED.get(env.COMMUNITY_FEED.idFromName(communityId));
await stub.initialize(communityConfig);
```

### コミュニティに参加

```typescript
// ユーザーのPDSにメンバーシップレコードを書き込み
await agent.com.atproto.repo.createRecord({
  repo: agent.session.did,
  collection: 'net.atrarium.community.membership',
  record: {
    $type: 'net.atrarium.community.membership',
    community: 'at://did:plc:alice/net.atrarium.community.config/xxx',
    role: 'member',
    joinedAt: new Date().toISOString(),
    active: true
  }
});

// FirehoseがDurable Objectのメンバーシップキャッシュを自動更新
```

### ポストを非表示（モデレーション）

```typescript
// モデレーターのPDSにモデレーションアクションを書き込み
await agent.com.atproto.repo.createRecord({
  repo: agent.session.did,
  collection: 'net.atrarium.moderation.action',
  record: {
    $type: 'net.atrarium.moderation.action',
    action: 'hide_post',
    target: 'at://did:plc:user/app.bsky.feed.post/xxx',
    community: 'at://did:plc:alice/net.atrarium.community.config/yyy',
    reason: 'オフトピック',
    createdAt: new Date().toISOString()
  }
});

// FirehoseがDurable Objectのモデレーション状態を自動更新
```

## D1アーキテクチャからの移行

以前のバージョンのAtrariumはデータストレージにCloudflare D1（SQLite）を使用していました。PDS-firstアーキテクチャは以下を提供します:

**メリット**:
- 🔓 **真のデータ所有権**: ユーザーがDID経由でコミュニティデータを所有
- 💰 **92%のコスト削減**: $5/月 → $0.40/月
- 📈 **無制限のスケーラビリティ**: データベースボトルネックなし
- 🔄 **自動同期**: FirehoseがDurable ObjectsをPDSと同期

**移行手順**:
1. D1からコミュニティ/メンバーシップデータをエクスポート
2. AT Protocolを使用してユーザーPDSにレコードを書き込み
3. FirehoseがDurable Objectsに自動的にインデックス
4. フィード生成が正しく動作することを確認
5. D1データベースを廃止

## 関連ドキュメント

- [システムアーキテクチャ](/ja/architecture/system-design)
- [AT Protocol Lexiconスキーマ](https://github.com/tar-bin/atrarium/tree/main/specs/006-pds-1-db/contracts/lexicon)
- [Durable Objectsドキュメント](https://developers.cloudflare.com/durable-objects/)
- [AT Protocol仕様](https://atproto.com/specs/lexicon)
