---
title: 開発仕様
description: Atrarium開発仕様書
order: 3
---

# 開発仕様

Atrarium開発仕様書です。

完全な開発仕様については、元のドキュメント[docs/development-spec.md](https://github.com/tar-bin/atrarium/blob/main/docs/development-spec.md)を参照してください。

## 概要

この仕様書では、Atrariumの開発における技術的要件、アーキテクチャ決定、実装ガイドラインを定義します。

## 技術要件

### 必須要件
- Node.js 18+
- TypeScript 5.7+
- Cloudflare Workers
- D1 Database
- AT Protocol SDK

### 推奨要件
- Vitest（テスト）
- Hono（Webフレームワーク）
- Zod（バリデーション）

## アーキテクチャ決定

### ADR-001: Cloudflare Workers採用

**決定**: バックエンドにCloudflare Workersを使用

**理由**:
- サーバーレス（運用負荷ゼロ）
- エッジコンピューティング（低レイテンシ）
- 無料枠が大きい（月10Mリクエスト）

### ADR-002: D1 Database採用

**決定**: D1（SQLite）をデータストアに使用

**理由**:
- SQL標準（学習コストゼロ）
- リレーショナルモデル（複雑なクエリ対応）
- 無料枠が大きい（5GB、5M reads/day）

## 実装ガイドライン

### コーディング規約
- ESLint + Prettierでフォーマット
- TypeScript strictモード有効化
- 関数は最大50行
- ファイルは最大300行

### テスト戦略
- ユニットテスト：全関数
- 統合テスト：APIエンドポイント
- コントラクトテスト：外部API呼び出し

詳細は[英語版](/reference/development-spec)を参照してください。
