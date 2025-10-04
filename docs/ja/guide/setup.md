---
title: セットアップガイド
description: Atrariumのインストールとデプロイ手順
order: 2
---

# セットアップガイド

このガイドでは、Atrariumのローカル開発環境または本番環境のセットアップ方法を説明します。

## 前提条件

- **Node.js 18+**: [nodejs.org](https://nodejs.org/)からインストール
- **Wrangler CLI**: Cloudflare Workersコマンドラインツール
- **Git**: バージョン管理
- **Cloudflareアカウント**: 無料プランで十分

## ローカル開発セットアップ

### 1. Wrangler CLIインストール

```bash
npm install -g wrangler
wrangler login  # Cloudflareで認証
```

### 2. リポジトリクローン

```bash
git clone https://github.com/tar-bin/atrarium.git
cd atrarium
```

### 3. 依存関係インストール

```bash
npm install
```

### 4. Cloudflareリソース作成

```bash
# D1データベース作成
wrangler d1 create atrarium-db

# KVネームスペース作成（投稿キャッシュ用）
wrangler kv:namespace create POST_CACHE
```

### 5. wrangler.toml設定

前ステップで取得したデータベースIDとKV IDで`wrangler.toml`を更新します：

```toml
[[d1_databases]]
binding = "DB"
database_name = "atrarium-db"
database_id = "your-database-id"  # 実際のIDに置き換え

[[kv_namespaces]]
binding = "POST_CACHE"
id = "your-kv-id"  # 実際のIDに置き換え
```

### 6. データベーススキーマ適用

```bash
wrangler d1 execute atrarium-db --file=./schema.sql
```

### 7. シークレット設定

```bash
# 認証用JWTシークレット
wrangler secret put JWT_SECRET

# Bluesky認証情報（Firehoseアクセス用）
wrangler secret put BLUESKY_HANDLE
wrangler secret put BLUESKY_APP_PASSWORD
```

### 8. 開発サーバー起動

```bash
npm run dev
```

`http://localhost:8787` でFeed Generator APIが動作します。

## 本番デプロイ

### 1. ビルドとデプロイ

```bash
npm run deploy
```

### 2. デプロイ確認

DIDドキュメントエンドポイントを確認：

```bash
curl https://your-worker.workers.dev/.well-known/did.json
```

### 3. Feed Generator登録

AT Protocolの[Feed Generator登録ガイド](https://docs.bsky.app/docs/starter-templates/custom-feeds)に従ってフィードを公開します。

## テスト

### テスト実行

```bash
# 全テスト実行
npm test

# ウォッチモードでテスト
npm run test:watch

# 型チェック
npm run typecheck
```

### テストデータ投入

```bash
wrangler d1 execute atrarium-db --file=seeds/test-data.sql
```

## よく使うコマンド

### データベース管理

```bash
# SQLクエリ実行
wrangler d1 execute atrarium-db --command "SELECT * FROM communities"

# データベース情報表示
wrangler d1 info atrarium-db
```

### モニタリング

```bash
# リアルタイムログ表示
wrangler tail

# フォーマット済みログ
wrangler tail --format pretty
```

## トラブルシューティング

### "Module not found"エラー
- `npm install`を再実行
- node_modulesをクリアして再インストール：`rm -rf node_modules && npm install`

### D1データベースが見つからない
- wrangler.tomlに正しいdatabase_idが設定されているか確認
- データベースが存在するか確認：`wrangler d1 list`

### 認証エラー
- シークレットが設定されているか確認：`wrangler secret list`
- JWT_SECRETが設定されているか確認

### ビルド失敗
- 型チェック実行：`npm run typecheck`
- TypeScriptファイルの構文エラー確認

## 次のステップ

- [クイックスタートガイド](/ja/guide/quickstart) - 一般的なタスクと使用パターン
- [システムアーキテクチャ](/ja/architecture/system-design) - 設計の理解
- [APIリファレンス](/ja/reference/api-reference) - エンドポイントドキュメント
