@AGENTS.md

タスクが終わるごとに git commit してから次へ

実装タスクは `task.md` を参照する。完了したらチェックボックスを更新する。

指示を受けて不具合が生じたときは、同じミスを繰り返さないように原因と対応策をこのファイル下部の「過去の不具合と対策」セクションに追記する。

## 過去の不具合と対策

### Studio1000 が検索結果に全く出ない（2026-05）
- **原因**: `src/lib/providers/studio1000.ts` の `isOsaka()` 最終行で `room.studio.id` を裸でアクセスしていた。API が `studio: null` の部屋を 1 件でも返すと `TypeError: Cannot read properties of null (reading 'id')` でプロバイダー全体が reject。`Promise.allSettled` に拾われて Studio1000 が丸ごと消える。
- **対策**: 外部 API レスポンスは欠損があり得る前提で、optional chaining + デフォルト値で防御する（`room.studio?.id ?? -1`）。`/api/availability` のレスポンスに `errors[]` を含めて UI 側から原因が見えるようにした。

### Leaflet クラスタリング追加後、地図にピンが表示されない（race condition）
- **原因**: マップ初期化は async (`Promise.all([import("leaflet"), ...])`) なのに、マーカー追加の useEffect は `if (!mapRef.current) return` で早期離脱。venues データが先に到着すると一度抜けた後、deps が変わらず再実行されず、ピンが永遠に追加されない。
- **対策**: `mapReady` という useState フラグを導入し、マップ初期化完了時にセット。マーカー追加・選択 effect の deps に含めて、マップ準備完了後に再実行されるようにする。

### Next.js + leaflet プラグイン（leaflet.markercluster 等）で地図自体が消える
- **原因**: webpack の dynamic import で `leaflet.markercluster` が `require('leaflet')` する際、ESM dynamic import で取得した leaflet とは別インスタンスを掴むことがあり、`L.markerClusterGroup` が undefined のまま。プラグインを呼び出すと例外でマップ生成が止まる。
- **対策**: leaflet を import した直後に `(window as any).L = L` でグローバルを先にセットしてからプラグインを動的 import する。Promise/async 内の例外は `.catch(console.error)` で必ずサーフェスし、コンソールから原因を切り分けられるようにする。

