# 新プロバイダ追加手順

## ステップ 1: scaffold スクリプトでファイル生成

```bash
npm run new-provider <id> "<表示名>"
# 例
npm run new-provider mycompany "My Company"
```

生成されるファイル: `src/lib/providers/mycompany.ts`

---

## ステップ 2: index.ts に登録

`src/lib/providers/index.ts` を編集:

```typescript
import { MycompanyProvider } from "./mycompany"   // 追加

const PROVIDERS: AvailabilityProvider[] = [
  new StudioAxProvider(),
  new AlleyoopProvider(),
  new Studio1000Provider(),
  new MycompanyProvider(),   // 追加
]
```

---

## ステップ 3: 表示名を registry.ts に追加

`src/lib/providers/registry.ts` を編集:

```typescript
export const PROVIDER_LABELS: Record<string, string> = {
  studioax: "Studio AX",
  alleyoop: "Alleyoop",
  studio1000: "Studio1000",
  mycompany: "My Company",   // 追加
}
```

---

## ステップ 4: venueMaster.ts にマスターデータを追加（任意）

座標・住所・部屋情報が静的に決まる場合は `src/lib/venueMaster.ts` に登録しておくと、
API が不完全な場合でも正しい情報を表示できます。

```typescript
{ providerId: "mycompany", venueId: "mycompany-01", venueName: "マイカンパニー", ... }
```

---

## fetchAvailability の実装ガイド

```typescript
async fetchAvailability(date: string): Promise<ProviderVenue[]> {
  // 1. APIからデータ取得（_utils の fetchJson を推奨）
  const data = await fetchJson<YourApiType[]>(`${BASE_URL}/slots?date=${date}`, {
    cache: "no-store",
  })

  // 2. ProviderVenue[] 形式に変換して返す
  return [{
    venueId: "mycompany-01",
    venueName: "マイカンパニー",
    providerId: this.providerId,
    address: "大阪府大阪市...",
    lat: 34.693,
    lng: 135.502,
    sourceUrl: "https://mycompany.example.com",
    rooms: data.map((room) => ({
      roomId: String(room.id),
      roomName: room.name,
      capacity: room.capacity ?? null,
      slots: room.times.map((t) => ({
        start: t.start,   // "HH:MM" 形式
        end: t.end,
        price: t.price ?? null,
        isAllnight: t.allnight ?? false,
      })),
    })).filter((r) => r.slots.length > 0),
  }]
}
```

---

## よくある落とし穴

### 1. 外部 API の null は optional chaining で防御する

```typescript
// ❌ 危険: API が null を返すと TypeError でプロバイダ全体が消える
room.studio.id

// ✅ 安全
room.studio?.id ?? -1
```

詳細: `CLAUDE.md` の「Studio1000 が検索結果に全く出ない」事例を参照。

### 2. 並列取得は Promise.allSettled を使う

```typescript
// ❌ 1件失敗すると全部失敗
const results = await Promise.all(rooms.map(fetchRoom))

// ✅ 1件失敗しても他は返せる
const results = await Promise.allSettled(rooms.map(fetchRoom))
const ok = results
  .filter((r): r is PromiseFulfilledResult<Room> => r.status === "fulfilled")
  .map((r) => r.value)
```

### 3. 大阪府内フィルタ

```typescript
import { isOsakaBounds } from "./_utils"

// 座標ベース
const isOsaka = isOsakaBounds(lat, lng)

// 住所ベース（座標がない場合の補完）
const isOsaka = address.includes("大阪")
```

### 4. dev server でエラーが出ない確認

scaffold 直後（空実装の状態）で dev server を起動し、
`/api/availability` のレスポンス `errors[]` に新プロバイダの名前が出ないことを確認してください。
