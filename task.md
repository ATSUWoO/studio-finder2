# 実装タスク

このプロジェクトで進める実装計画。**上から順番に一つずつ**取り組み、PR を分ける。

各タスク完了時はチェックボックスを `[x]` に更新する。

---

## ① 地図ピンのクラスタリング ✅

**目的**：梅田 兎我野町周辺で複数スタジオのピンが重なって読めない問題を解消。

**方針**：定番プラグイン `leaflet.markercluster` を使用。

**やること**
- [x] `leaflet.markercluster` と型定義を npm install
- [x] `StudioMap.tsx` でマーカーを直接 `map.addTo` せずに `L.markerClusterGroup()` 経由で追加
- [x] クラスタアイコンを既存トーン（インディゴ系）に合わせて custom (`iconCreateFunction`)
- [x] ズームインで展開、適切なズーム閾値で `disableClusteringAtZoom` を設定
- [x] 選択ピンが含まれるクラスタは自動展開（`zoomToShowLayer` で展開後 pan）

**完了条件**
- 梅田エリアでズームアウト時にピンがまとまる
- ズームインで展開され、個別ピンが従来通り表示される
- 選択中のスタジオが含まれるクラスタをクリックすると展開＆選択状態維持

---

## ② モバイル UX 改善

**目的**：list/map のタブ完全分離による情報断絶を解消し、片手操作で快適に。

**やること**
- [x] 地図タブ時：選択中スタジオのミニカードを下部にボトムシート風に表示（位置・料金・予約リンク）
- [x] ピンタップ時に十分なズームレベル（`zoom 15` 程度）まで自動ズーム
- [x] タブバーをセグメント風（角丸ピル）にリデザインしてタップ領域拡大
- [x] 「選択解除」を地図空白タップ / ESC で可能に

**完了条件**
- モバイル幅で地図タブを開き、ピンタップで下部にカード出現
- カードの「予約サイトへ」リンクが機能
- タブ切り替えなしで主要情報にアクセスできる

---

## ③ 双方向連動の改善

**目的**：list⇔map の連動をよりシームレスに。

**やること**
- [x] カードクリック時：地図側を pan + 軽く zoom（現在は pan のみ）
- [x] モバイルでピンクリック時：自動で list タブに切替 → 該当カードへスクロール
- [x] 選択中ピンの強調表示を強化（pulse アニメーション等）

**完了条件**
- PC: カードクリックで地図がスムーズに該当エリアへ
- モバイル: ピンクリックで自動的にカード位置までジャンプ

---

## ④ 「いま空いてる」クイックフィルタ ✅

**目的**：頻出ユースケース「今から練習したい」「今夜空きある？」をワンタップで。

**やること**
- [x] `SearchFilters.tsx` 上部に横並びチップを追加：「今すぐ」「今夜(18-23)」「明日朝(7-12)」
- [x] 「今すぐ」：date=今日、openHour=現在時刻の hour（切り上げ）、closeHour=null
- [x] 「今夜」：date=今日、openHour=18、closeHour=23
- [x] 「明日朝」：date=明日、openHour=7、closeHour=12
- [x] アクティブ判定（現在の filter 値とチップの想定値が一致するかでハイライト）

**完了条件**
- チップタップで date と時間が一括更新され結果が即反映
- 別チップタップで切り替え、再タップで解除できる

---

## ⑤ 連続コマ検索（2h / 3h / オールナイト）✅

**目的**：単発1時間ではなく「2時間以上連続して空いている枠」を見たい（ダンサーの典型ニーズ）。

**やること**
- [x] `SearchFilters` 型に `durationFilter: "2h" | "3h" | "allnight" | null` を追加
- [x] UI：プルダウン「コマ ▼ / 2h連続 / 3h連続 / オールナイトのみ」
- [x] API（`route.ts`）で同一 room の slot を `start` でソートし、隣接判定（`prev.end === next.start`）で連結
- [x] 連結後の合計時間 ≥ `minDurationHours` のグループだけ通す
- [x] 「オールナイトのみ」：`slot.isAllnight === true` だけ通す

**完了条件**
- 「2h連続」選択時、単発1時間しか空いてない部屋は結果から消える
- 「3h連続」は2hの結果からさらに絞られる
- 「オールナイトのみ」は深夜帯のみ表示

---

## ⑥ エリアフィルタ（梅田/難波/心斎橋等）✅

**目的**：エリア指定をワンタップで（住所文字列検索より早い）。

**やること**
- [x] `src/lib/areas.ts`（新）にエリア定義：梅田/難波/心斎橋/天王寺/京橋/本町/福島/天満（中心 lat/lng + 半径 km）
- [x] `SearchFilters` 型に `areaId: string | null` を追加
- [x] UI：地名チップ（Task② ピル UI を流用、横スクロール可）
- [x] API：選択エリア中心からの半径内 venue だけ通す（haversine 近似で OK）
- [x] lat/lng null の venue は address の地名キーワードで補完判定

**完了条件**
- 「梅田」チップで梅田駅周辺 ~1.5km の venue だけ残る
- 他エリアも同様に動作
- チップ再タップで解除（areaId=null）

---

## ⑦ 並び替え + URL クエリ同期 + お気に入り

**目的**：結果を整理・共有・再訪可能に。

**やること**
- [ ] **並び替え**：`sortBy: "default" | "priceAsc" | "slotsDesc" | "nameAsc"` を追加。クライアント側ソート
- [ ] **URL クエリ同期**：`useSearchParams` + `router.replace` で filters ⇔ query string の双方向同期
- [ ] **お気に入り**：`useFavorites` フック（localStorage `studio-finder.favorites`）。カードに ★ アイコン
- [ ] 「★ のみ表示」トグルをフィルタ列に追加

**完了条件**
- 並び替えセレクタで結果順が変わる
- URL にフィルタが反映され、戻るボタン / シェアが機能
- 星トグル ON でお気に入り店舗のみ表示

---

## ⑧ プロバイダ追加の半自動化

**目的**：新プロバイダ追加時の触る箇所と手順を最小化する。

**やること**
- [ ] **構造整理**：`src/lib/providers/registry.ts`（新）に `PROVIDER_LABELS` を集約し、`AvailabilityCard.tsx` / `page.tsx` の重複を import に置換
- [ ] 共通ユーティリティを `src/lib/providers/_utils.ts` に抽出（`parseHHmm`, `isOsakaAddress`, master マージ等）
- [ ] **scaffold スクリプト**：`scripts/new-provider.ts` + `package.json` に `"new-provider"` を追加
  - 使い方：`npm run new-provider mycompany "My Company"`
  - 生成：`providers/mycompany.ts`、`index.ts` への登録挿入、`registry.ts` のラベル追加
- [ ] **ドキュメント**：`docs/ADD_PROVIDER.md`（新）に手順・テンプレの埋め方・落とし穴（null guard, Osaka filter, allSettled）を記載

**完了条件**
- `npm run new-provider foo "Foo Studio"` で関連ファイルが自動生成・登録される
- 生成直後の dev server で `foo` プロバイダがエラーなく no-op として動く
- `docs/ADD_PROVIDER.md` を読むだけで新プロバイダを追加できる
