# スタジオファインダー

大阪市内のダンス・レンタルスタジオを検索できるWebアプリです。料金・定員・時間帯で絞り込み、地図上でスタジオを探せます。

## 機能

- **ライブフィルタリング** — 料金・定員・時間帯・フリーテキストで即座に絞り込み
- **地図連動** — 地図のピンと一覧カードが双方向に連動
- **2層データ構造** — 店舗（venue）と部屋（room）を分けて管理
- **マルチソース対応** — 複数の予約サイトからデータを収集できるスクレイパー基盤

## ローカルでの起動

```bash
# 依存パッケージをインストール
npm install

# 開発サーバーを起動
npm run dev
```

http://localhost:3000 をブラウザで開いてください。

## 技術スタック

| 用途 | 技術 |
|------|------|
| フロントエンド | Next.js 16 (App Router) + TypeScript |
| スタイリング | Tailwind CSS |
| 地図 | Leaflet + CartoDB Voyager tiles |
| データベース | Supabase (PostgreSQL) |
| スクレイピング | Playwright / Cheerio |

## プロジェクト構成

```
src/
├── app/
│   ├── page.tsx              # 検索トップページ
│   ├── api/venues/route.ts   # 検索API
│   └── venues/[id]/page.tsx  # 店舗詳細ページ
├── components/
│   ├── SearchFilters.tsx     # 絞り込みフォーム
│   ├── StudioList.tsx        # 一覧表示
│   ├── StudioCard.tsx        # 店舗カード
│   └── StudioMap.tsx         # 地図コンポーネント
├── data/demo.ts              # デモデータ（大阪市10店舗）
├── lib/
│   ├── types.ts              # 型定義
│   └── utils.ts              # ユーティリティ関数
└── scrapers/
    ├── base.ts               # BaseScraper抽象クラス
    ├── registry.ts           # スクレイパー一覧
    ├── runner.ts             # 一括実行スクリプト
    └── sites/
        ├── spacemarket.ts    # スペースマーケット用
        └── instabas.ts       # インスタベース用
```

## 環境変数

Supabaseに接続する場合は `.env.local` を作成してください。

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

現在はデモデータ（`src/data/demo.ts`）を使用しているため、Supabaseなしでも動作します。
